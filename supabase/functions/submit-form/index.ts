import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmissionData {
  [key: string]: any;
  __honeypot?: string;
  __timestamp?: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting cache
const submissionCache = new Map<string, number[]>();

const detectSpam = (data: SubmissionData, ip: string): { isSpam: boolean; reason: string; signals: Array<{ signal: string; score: number }> } => {
  const signals: Array<{ signal: string; score: number }> = [];
  
  // Honeypot check
  if (data.__honeypot && data.__honeypot !== '') {
    signals.push({ signal: 'honeypot_filled', score: 100 });
    return { isSpam: true, reason: 'Honeypot field was filled', signals };
  }
  
  // Timestamp check (submissions should take at least 2 seconds)
  if (data.__timestamp) {
    const submissionTime = parseInt(data.__timestamp);
    const now = Date.now();
    const timeDiff = (now - submissionTime) / 1000;
    
    if (timeDiff < 2) {
      signals.push({ signal: 'too_fast', score: 80 });
      return { isSpam: true, reason: 'Form submitted too quickly', signals };
    }
  }
  
  // IP rate limiting (max 3 submissions per 5 minutes)
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  
  if (submissionCache.has(ip)) {
    const timestamps = submissionCache.get(ip)!.filter(ts => ts > fiveMinutesAgo);
    if (timestamps.length >= 3) {
      signals.push({ signal: 'rate_limit_exceeded', score: 90 });
      return { isSpam: true, reason: 'Too many submissions from this IP', signals };
    }
    timestamps.push(now);
    submissionCache.set(ip, timestamps);
  } else {
    submissionCache.set(ip, [now]);
  }
  
  // Check for suspicious patterns
  const values = Object.values(data).filter(v => typeof v === 'string');
  const hasMultipleUrls = values.some(v => (v.match(/https?:\/\//g) || []).length > 2);
  
  if (hasMultipleUrls) {
    signals.push({ signal: 'multiple_urls', score: 60 });
  }
  
  const totalScore = signals.reduce((sum, s) => sum + s.score, 0);
  const isSpam = totalScore >= 70;
  
  return { 
    isSpam, 
    reason: isSpam ? 'Spam score threshold exceeded' : '',
    signals 
  };
};

const sendNotificationEmail = async (formName: string, notificationEmail: string, submissionData: any, submissionId: string) => {
  try {
    const dataHtml = Object.entries(submissionData)
      .filter(([key]) => !key.startsWith('__'))
      .map(([key, value]) => `<p><strong>${key}:</strong> ${JSON.stringify(value)}</p>`)
      .join('');
    
    const { data, error } = await resend.emails.send({
      from: "FormSaaS <onboarding@resend.dev>",
      to: [notificationEmail],
      subject: `New submission for ${formName}`,
      html: `
        <h2>New Form Submission</h2>
        <p>You have received a new submission for your form: <strong>${formName}</strong></p>
        <hr />
        ${dataHtml}
        <hr />
        <p style="color: #666; font-size: 12px;">Submission ID: ${submissionId}</p>
      `,
    });

    await supabase.from('email_logs').insert({
      submission_id: submissionId,
      status: error ? 'failed' : 'sent',
      provider_response: error ? { error: error.message } : data,
    });

    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent successfully:', data);
    }
  } catch (error) {
    console.error('Error in email notification:', error);
    await supabase.from('email_logs').insert({
      submission_id: submissionId,
      status: 'failed',
      provider_response: { error: String(error) },
    });
  }
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const formId = pathParts[pathParts.length - 1];

    if (!formId) {
      return new Response(
        JSON.stringify({ error: 'Form ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get form details
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .eq('is_active', true)
      .single();

    if (formError || !form) {
      return new Response(
        JSON.stringify({ error: 'Form not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const submissionData: SubmissionData = await req.json();
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    // Clean payload (remove spam detection fields)
    const cleanPayload = { ...submissionData };
    delete cleanPayload.__honeypot;
    delete cleanPayload.__timestamp;

    // Spam detection
    const spamCheck = detectSpam(submissionData, ip);

    // Insert submission
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .insert({
        form_id: formId,
        payload: cleanPayload,
        ip,
        user_agent: userAgent,
        is_spam: spamCheck.isSpam,
        spam_reason: spamCheck.reason,
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Error inserting submission:', submissionError);
      return new Response(
        JSON.stringify({ error: 'Failed to save submission' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert spam signals
    if (spamCheck.signals.length > 0) {
      await supabase.from('spam_signals').insert(
        spamCheck.signals.map(signal => ({
          submission_id: submission.id,
          signal: signal.signal,
          score: signal.score,
        }))
      );
    }

    // Send notification email for non-spam submissions
    if (!spamCheck.isSpam && form.notification_email) {
      sendNotificationEmail(
        form.name,
        form.notification_email,
        cleanPayload,
        submission.id
      ).catch(error => console.error('Background email error:', error));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Submission received',
        submission_id: submission.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing submission:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
