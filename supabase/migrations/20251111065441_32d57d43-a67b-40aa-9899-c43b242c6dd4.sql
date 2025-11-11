-- Create forms table
CREATE TABLE public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  definition JSONB NOT NULL DEFAULT '[]'::jsonb,
  notification_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create submissions table
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  ip TEXT,
  user_agent TEXT,
  is_spam BOOLEAN DEFAULT false,
  spam_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create spam_signals table
CREATE TABLE public.spam_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  signal TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create email_logs table
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  provider_response JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spam_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forms
CREATE POLICY "Users can view their own forms"
  ON public.forms FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own forms"
  ON public.forms FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own forms"
  ON public.forms FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own forms"
  ON public.forms FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for submissions (owners can view submissions for their forms)
CREATE POLICY "Form owners can view submissions"
  ON public.submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = submissions.form_id
      AND forms.owner_id = auth.uid()
    )
  );

-- RLS Policies for spam_signals
CREATE POLICY "Form owners can view spam signals"
  ON public.spam_signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions
      JOIN public.forms ON forms.id = submissions.form_id
      WHERE submissions.id = spam_signals.submission_id
      AND forms.owner_id = auth.uid()
    )
  );

-- RLS Policies for email_logs
CREATE POLICY "Form owners can view email logs"
  ON public.email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions
      JOIN public.forms ON forms.id = submissions.form_id
      WHERE submissions.id = email_logs.submission_id
      AND forms.owner_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to forms table
CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_forms_owner_id ON public.forms(owner_id);
CREATE INDEX idx_submissions_form_id ON public.submissions(form_id);
CREATE INDEX idx_submissions_created_at ON public.submissions(created_at);
CREATE INDEX idx_spam_signals_submission_id ON public.spam_signals(submission_id);
CREATE INDEX idx_email_logs_submission_id ON public.email_logs(submission_id);