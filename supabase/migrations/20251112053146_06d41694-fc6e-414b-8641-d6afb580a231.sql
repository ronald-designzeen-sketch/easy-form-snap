-- Add email template column to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS email_template TEXT;

-- Set a default template for existing forms
UPDATE forms SET email_template = '<h2>New Form Submission</h2>
<p>You have received a new submission for your form: <strong>{{formName}}</strong></p>
<hr />
{{fields}}
<hr />
<p style="color: #666; font-size: 12px;">Submission ID: {{submissionId}}</p>'
WHERE email_template IS NULL;