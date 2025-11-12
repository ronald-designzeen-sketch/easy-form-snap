import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Save, 
  Code, 
  Mail,
  X, 
  Loader2,
  Eye,
  GripVertical
} from 'lucide-react';
import { toast } from 'sonner';

// Field type definitions
interface BaseFormField {
  id: string;
  type: string;
  label: string;
  description?: string;
  required?: boolean;
  conditionalDisplay?: {
    fieldId: string;
    operator: 'equals' | 'notEquals' | 'contains';
    value: string;
  };
}

interface TextField extends BaseFormField {
  type: 'text' | 'email' | 'phone' | 'hidden';
  placeholder?: string;
  defaultValue?: string;
}

interface TextareaField extends BaseFormField {
  type: 'textarea';
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
}

interface CheckboxField extends BaseFormField {
  type: 'checkbox';
  defaultValue?: boolean;
}

interface SelectField extends BaseFormField {
  type: 'select';
  options: Array<{ label: string; value: string }>;
  multiple?: boolean;
}

interface NumberField extends BaseFormField {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

interface DateField extends BaseFormField {
  type: 'date';
  minDate?: string;
  maxDate?: string;
}

interface FileField extends BaseFormField {
  type: 'file';
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
}

type FormField = TextField | TextareaField | CheckboxField | SelectField | NumberField | DateField | FileField;

const FormBuilder = (): JSX.Element => {
  const [formName, setFormName] = useState('Untitled Form');
  const [fields, setFields] = useState<FormField[]>([]);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [emailTemplate, setEmailTemplate] = useState(`<h2>New Form Submission</h2>
<p>You have received a new submission for your form: <strong>{{formName}}</strong></p>
<hr />
{{fields}}
<hr />
<p style="color: #666; font-size: 12px;">Submission ID: {{submissionId}}</p>`);
  const [activeTab, setActiveTab] = useState('fields');
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch form data
  const { data: form, isLoading } = useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      if (!id) return null;
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

  // Load form data into state
  useEffect(() => {
    if (form) {
      setFormName(form.name);
      setFields(Array.isArray(form.definition) ? form.definition as unknown as FormField[] : []);
      setNotificationEmail(form.notification_email || '');
      setEmailTemplate(form.email_template || emailTemplate);
    }
  }, [form]);

  // Save form mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const formData = {
        name: formName,
        definition: fields as any,
        notification_email: notificationEmail,
        email_template: emailTemplate,
        owner_id: user.id,
      };

      if (id) {
        const { data, error } = await supabase
          .from('forms')
          .update(formData)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('forms')
          .insert(formData)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      toast.success('Form saved successfully');
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      if (!id) {
        navigate(`/forms/${data.id}`);
      }
    },
    onError: (error) => {
      toast.error('Failed to save form');
      console.error(error);
    },
  });

  const addField = (type: FormField['type']) => {
    const baseField = {
      id: `field_${Date.now()}`,
      label: `New ${type} field`,
      type,
      required: false,
    };

    let newField: FormField;
    
    switch (type) {
      case 'select':
        newField = { ...baseField, type: 'select', options: [{ label: 'Option 1', value: 'option1' }] } as SelectField;
        break;
      case 'textarea':
        newField = { ...baseField, type: 'textarea', rows: 3 } as TextareaField;
        break;
      case 'number':
        newField = { ...baseField, type: 'number', min: 0, max: 100, step: 1 } as NumberField;
        break;
      case 'date':
        newField = { ...baseField, type: 'date' } as DateField;
        break;
      case 'file':
        newField = { ...baseField, type: 'file', maxSize: 5242880 } as FileField;
        break;
      case 'checkbox':
        newField = { ...baseField, type: 'checkbox', defaultValue: false } as CheckboxField;
        break;
      default:
        newField = { ...baseField, type, placeholder: '' } as TextField;
    }

    setFields([...fields, newField]);
    setSelectedFieldIndex(fields.length);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates } as FormField;
    setFields(updatedFields);
  };

  const deleteField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
    if (selectedFieldIndex === index) setSelectedFieldIndex(null);
  };

  const renderFieldEditor = () => {
    if (selectedFieldIndex === null || !fields[selectedFieldIndex]) return null;
    
    const field = fields[selectedFieldIndex];
    const index = selectedFieldIndex;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Field</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Field Label</Label>
            <Input
              value={field.label}
              onChange={(e) => updateField(index, { label: e.target.value })}
            />
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Input
              value={field.description || ''}
              onChange={(e) => updateField(index, { description: e.target.value })}
              placeholder="Help text for this field"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={field.required}
              onCheckedChange={(checked) => updateField(index, { required: checked })}
            />
            <Label>Required field</Label>
          </div>

          {/* Type-specific fields */}
          {(field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'hidden') && (
            <div>
              <Label>Placeholder</Label>
              <Input
                value={field.placeholder || ''}
                onChange={(e) => updateField(index, { placeholder: e.target.value })}
              />
            </div>
          )}

          {field.type === 'textarea' && (
            <>
              <div>
                <Label>Placeholder</Label>
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => updateField(index, { placeholder: e.target.value })}
                />
              </div>
              <div>
                <Label>Rows</Label>
                <Input
                  type="number"
                  value={field.rows || 3}
                  onChange={(e) => updateField(index, { rows: parseInt(e.target.value) })}
                  min={1}
                  max={20}
                />
              </div>
            </>
          )}

          {field.type === 'number' && (
            <>
              <div>
                <Label>Minimum Value</Label>
                <Input
                  type="number"
                  value={field.min ?? ''}
                  onChange={(e) => updateField(index, { min: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
              <div>
                <Label>Maximum Value</Label>
                <Input
                  type="number"
                  value={field.max ?? ''}
                  onChange={(e) => updateField(index, { max: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
              <div>
                <Label>Step</Label>
                <Input
                  type="number"
                  value={field.step ?? 1}
                  onChange={(e) => updateField(index, { step: e.target.value ? parseFloat(e.target.value) : 1 })}
                />
              </div>
            </>
          )}

          {field.type === 'date' && (
            <>
              <div>
                <Label>Minimum Date</Label>
                <Input
                  type="date"
                  value={field.minDate || ''}
                  onChange={(e) => updateField(index, { minDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Maximum Date</Label>
                <Input
                  type="date"
                  value={field.maxDate || ''}
                  onChange={(e) => updateField(index, { maxDate: e.target.value })}
                />
              </div>
            </>
          )}

          {field.type === 'file' && (
            <>
              <div>
                <Label>Accepted File Types</Label>
                <Input
                  value={field.accept || ''}
                  onChange={(e) => updateField(index, { accept: e.target.value })}
                  placeholder="e.g., .pdf,.doc,.docx"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={field.multiple || false}
                  onCheckedChange={(checked) => updateField(index, { multiple: checked })}
                />
                <Label>Allow multiple files</Label>
              </div>
              <div>
                <Label>Max File Size (MB)</Label>
                <Input
                  type="number"
                  value={(field.maxSize || 5242880) / 1048576}
                  onChange={(e) => updateField(index, { maxSize: parseFloat(e.target.value) * 1048576 })}
                  min={0.1}
                  step={0.1}
                />
              </div>
            </>
          )}

          {field.type === 'select' && (
            <div>
              <Label>Options</Label>
              <div className="space-y-2">
                {field.options.map((option, optIndex) => (
                  <div key={optIndex} className="flex space-x-2">
                    <Input
                      value={option.label}
                      onChange={(e) => {
                        const newOptions = [...field.options];
                        newOptions[optIndex] = { ...option, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') };
                        updateField(index, { options: newOptions });
                      }}
                      placeholder="Option label"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newOptions = field.options.filter((_, i) => i !== optIndex);
                        updateField(index, { options: newOptions });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newOptions = [...field.options, { label: `Option ${field.options.length + 1}`, value: `option${field.options.length + 1}` }];
                    updateField(index, { options: newOptions });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {/* Conditional Display */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Conditional Display</h4>
            <p className="text-sm text-muted-foreground mb-2">Show this field only when...</p>
            <Select
              value={field.conditionalDisplay?.fieldId || 'none'}
              onValueChange={(value) => {
                if (value === 'none') {
                  const { conditionalDisplay, ...rest } = field;
                  updateField(index, rest);
                } else {
                  updateField(index, {
                    conditionalDisplay: {
                      fieldId: value,
                      operator: 'equals',
                      value: ''
                    }
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="No condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No condition</SelectItem>
                {fields.filter((f, i) => i !== index).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {field.conditionalDisplay && (
              <div className="mt-2 space-y-2">
                <Select
                  value={field.conditionalDisplay.operator}
                  onValueChange={(value) => {
                    updateField(index, {
                      conditionalDisplay: {
                        ...field.conditionalDisplay!,
                        operator: value as 'equals' | 'notEquals' | 'contains'
                      }
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="notEquals">Not equals</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={field.conditionalDisplay.value}
                  onChange={(e) => {
                    updateField(index, {
                      conditionalDisplay: {
                        ...field.conditionalDisplay!,
                        value: e.target.value
                      }
                    });
                  }}
                  placeholder="Value to check"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="text-2xl font-bold border-0 p-0 h-auto"
              placeholder="Form Name"
            />
          </div>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Form
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="email">Email Template</TabsTrigger>
          <TabsTrigger value="embed">Embed</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Form Fields</CardTitle>
                  <CardDescription>Add and configure form fields</CardDescription>
                </CardHeader>
                <CardContent>
                  {fields.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <p className="text-muted-foreground">No fields yet. Add your first field to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent ${
                            selectedFieldIndex === index ? 'bg-accent' : ''
                          }`}
                          onClick={() => setSelectedFieldIndex(index)}
                        >
                          <div className="flex items-center space-x-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{field.label}</div>
                              <div className="text-sm text-muted-foreground capitalize">{field.type}</div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteField(index);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Add Field</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" onClick={() => addField('text')}>Text</Button>
                    <Button variant="outline" onClick={() => addField('email')}>Email</Button>
                    <Button variant="outline" onClick={() => addField('phone')}>Phone</Button>
                    <Button variant="outline" onClick={() => addField('number')}>Number</Button>
                    <Button variant="outline" onClick={() => addField('date')}>Date</Button>
                    <Button variant="outline" onClick={() => addField('textarea')}>Textarea</Button>
                    <Button variant="outline" onClick={() => addField('select')}>Dropdown</Button>
                    <Button variant="outline" onClick={() => addField('checkbox')}>Checkbox</Button>
                    <Button variant="outline" onClick={() => addField('file')}>File Upload</Button>
                    <Button variant="outline" onClick={() => addField('hidden')}>Hidden</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>{renderFieldEditor()}</div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Form Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Notification Email</Label>
                <Input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="email@example.com"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Receive an email notification when someone submits this form
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email Template</CardTitle>
              <CardDescription>
                Customize the email notification template. Use {'{{'} formName {'}}'},  {'{{'} fields {'}}'},  and  {'{{'} submissionId {'}}'} as placeholders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={emailTemplate}
                onChange={(e) => setEmailTemplate(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embed">
          <Card>
            <CardHeader>
              <CardTitle>Embed Code</CardTitle>
              <CardDescription>Copy this code to embed the form on your website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <code className="text-sm">
                  {`<script src="${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-form/${id || 'FORM_ID'}" data-form-id="${id || 'FORM_ID'}"></script>`}
                </code>
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `<script src="${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-form/${id || 'FORM_ID'}" data-form-id="${id || 'FORM_ID'}"></script>`
                  );
                  toast.success('Embed code copied!');
                }}
              >
                <Code className="mr-2 h-4 w-4" />
                Copy Code
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FormBuilder;
