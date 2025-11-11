import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ArrowLeft, Save, Code } from 'lucide-react';
import { toast } from 'sonner';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'textarea' | 'checkbox' | 'select';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

const FormBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<FormField[]>([]);
  const [embedCode, setEmbedCode] = useState('');

  const { data: form, isLoading } = useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useState(() => {
    if (form?.definition) {
      try {
        setFields(form.definition as unknown as FormField[]);
      } catch {
        setFields([]);
      }
    }
  });

  const saveFormMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('forms')
        .update({ definition: fields as any })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form', id] });
      toast.success('Form saved successfully!');
    },
    onError: () => {
      toast.error('Failed to save form');
    },
  });

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false,
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const deleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const generateEmbedCode = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const code = `<!-- FormSaaS Embed Code -->
<div id="formsaas-${id}"></div>
<script>
(function() {
  const form = document.createElement('form');
  form.className = 'formsaas-form';
  form.innerHTML = \`${fields.map(field => {
    if (field.type === 'textarea') {
      return `<div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">${field.label}${field.required ? ' *' : ''}</label>
        <textarea name="${field.id}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.375rem;"></textarea>
      </div>`;
    } else if (field.type === 'select') {
      return `<div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">${field.label}${field.required ? ' *' : ''}</label>
        <select name="${field.id}" ${field.required ? 'required' : ''} style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.375rem;">
          <option value="">Select...</option>
          ${(field.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('')}
        </select>
      </div>`;
    } else if (field.type === 'checkbox') {
      return `<div style="margin-bottom: 1rem;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" name="${field.id}" ${field.required ? 'required' : ''} style="margin-right: 0.5rem;">
          <span>${field.label}${field.required ? ' *' : ''}</span>
        </label>
      </div>`;
    } else {
      return `<div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">${field.label}${field.required ? ' *' : ''}</label>
        <input type="${field.type}" name="${field.id}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.375rem;">
      </div>`;
    }
  }).join('')}
  <input type="hidden" name="__timestamp" value="">
  <input type="hidden" name="__honeypot" value="" style="display: none;">
  <button type="submit" style="background: #3b82f6; color: white; padding: 0.5rem 1.5rem; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500;">Submit</button>
  \`;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.__timestamp = Date.now().toString();
    
    try {
      const response = await fetch('${supabaseUrl}/functions/v1/submit-form/${id}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        alert('Form submitted successfully!');
        form.reset();
      } else {
        alert('Failed to submit form');
      }
    } catch (error) {
      alert('Error submitting form');
    }
  });
  
  document.getElementById('formsaas-${id}').appendChild(form);
})();
</script>`;
    setEmbedCode(code);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">{form?.name}</h1>
          </div>
          <Button onClick={() => saveFormMutation.mutate()} disabled={saveFormMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveFormMutation.isPending ? 'Saving...' : 'Save Form'}
          </Button>
        </div>

        <Tabs defaultValue="builder" className="space-y-4">
          <TabsList>
            <TabsTrigger value="builder">Form Builder</TabsTrigger>
            <TabsTrigger value="embed">Embed Code</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Form Fields</CardTitle>
                  <Button onClick={addField}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No fields yet. Click "Add Field" to get started.
                  </p>
                ) : (
                  fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">Field {index + 1}</h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteField(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => updateField(index, { label: e.target.value })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                              value={field.type}
                              onValueChange={(value: any) => updateField(index, { type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="textarea">Textarea</SelectItem>
                                <SelectItem value="checkbox">Checkbox</SelectItem>
                                <SelectItem value="select">Select</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Placeholder</Label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(index, { placeholder: e.target.value })}
                          />
                        </div>

                        {field.type === 'select' && (
                          <div className="space-y-2">
                            <Label>Options (comma-separated)</Label>
                            <Input
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateField(index, { 
                                options: e.target.value.split(',').map(s => s.trim()) 
                              })}
                            />
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(index, { required: e.target.checked })}
                            className="h-4 w-4"
                          />
                          <Label>Required field</Label>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="embed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Embed Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Copy this code and paste it into your website to embed the form.
                </p>
                <Button onClick={generateEmbedCode}>
                  <Code className="mr-2 h-4 w-4" />
                  Generate Embed Code
                </Button>
                {embedCode && (
                  <div className="space-y-2">
                    <Textarea
                      value={embedCode}
                      readOnly
                      rows={15}
                      className="font-mono text-sm"
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(embedCode);
                        toast.success('Embed code copied to clipboard!');
                      }}
                    >
                      Copy to Clipboard
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FormBuilder;
