import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Link as LinkIcon, 
  X, 
  ArrowUp, 
  ArrowDown, 
  Loader2,
  Eye,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// Base field type that all fields extend
interface BaseFormField {
  id: string;
  type: string;
  label: string;
  description?: string;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
  visibilityCondition?: Record<string, unknown>;
  validation?: Record<string, unknown>;
}

// Text field types (text, email, phone, hidden)
interface TextField extends BaseFormField {
  type: 'text' | 'email' | 'phone' | 'hidden';
  placeholder?: string;
  defaultValue?: string;
}

// Textarea field type
interface TextareaField extends BaseFormField {
  type: 'textarea';
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
}

// Checkbox field type
interface CheckboxField extends BaseFormField {
  type: 'checkbox';
  defaultValue?: boolean;
  labelPosition?: 'left' | 'right';
}

// Select field type
interface SelectField extends BaseFormField {
  type: 'select';
  options: Array<{ label: string; value: string }>;
  multiple?: boolean;
  defaultValue?: string | string[];
}

// Number field type
interface NumberField extends BaseFormField {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  defaultValue?: number;
}

// Date field type
interface DateField extends BaseFormField {
  type: 'date';
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  defaultValue?: string;
}

// File upload field type
interface FileField extends BaseFormField {
  type: 'file';
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
}

// Calculation field type
interface CalculationField extends BaseFormField {
  type: 'calculation';
  formula: string;
  precision?: number;
  readOnly?: boolean;
  defaultValue?: string | number;
}

// Section field type
interface SectionField extends BaseFormField {
  type: 'section';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

// Page break field type
interface PageBreakField extends BaseFormField {
  type: 'pagebreak';
  nextButtonText?: string;
  previousButtonText?: string;
  showPageNumbers?: boolean;
}

// Union type for all field types
type FormField = 
  | TextField 
  | TextareaField 
  | CheckboxField 
  | SelectField 
  | NumberField 
  | DateField 
  | FileField 
  | CalculationField 
  | SectionField 
  | PageBreakField;

interface SelectOption {
  label: string;
  value: string;
  id?: string;
}

interface FormSettings {
  allowedDomains: string[];
  notificationEmails: string[];
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
}

const FormBuilder = (): JSX.Element => {
  // State for form fields and settings
  const [fields, setFields] = useState<FormField[]>([]);
  const [settings, setSettings] = useState<FormSettings>({
    allowedDomains: [],
    notificationEmails: [],
    required: false,
    placeholder: '',
    options: []
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('fields');
  const [isSaving, setIsSaving] = useState(false);
  const [currentField, setCurrentField] = useState<number | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  
  // Router and query client
  const { id: idParam, slug } = useParams<{ id?: string; slug?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Derive the actual ID (handle both old and new URL formats)
  const id = idParam || (slug ? slug.split('-').pop() : undefined);
  
  // Function to create a new field with default values
  const createNewField = (fieldType: FormField['type']): FormField => {
    const baseField = {
      id: `field-${Date.now()}`,
      type: fieldType,
      label: `New ${fieldType} Field`,
      required: false
    };
    
    switch (fieldType) {
      case 'select':
        return {
          ...baseField,
          type: 'select',
          options: [{ label: 'Option 1', value: 'option1' }],
          multiple: false
        };
      case 'number':
        return {
          ...baseField,
          type: 'number',
          min: 0,
          max: 100,
          step: 1
        };
      case 'date':
        return {
          ...baseField,
          type: 'date',
          minDate: new Date().toISOString().split('T')[0]
        };
      case 'checkbox':
        return {
          ...baseField,
          type: 'checkbox',
          defaultValue: false,
          labelPosition: 'right'
        };
      case 'textarea':
        return {
          ...baseField,
          type: 'textarea',
          rows: 3,
          placeholder: ''
        };
      case 'section':
        return {
          ...baseField,
          type: 'section',
          collapsible: false,
          defaultCollapsed: false
        };
      case 'pagebreak':
        return {
          ...baseField,
          type: 'pagebreak',
          nextButtonText: 'Next',
          previousButtonText: 'Back',
          showPageNumbers: true
        };
      case 'calculation':
        return {
          ...baseField,
          type: 'calculation',
          formula: '',
          precision: 2,
          readOnly: true
        };
      default: // text, email, phone, hidden
        return {
          ...baseField,
          type: fieldType as 'text' | 'email' | 'phone' | 'hidden',
          placeholder: ''
        };
    }
  };

  // Field management functions
  const addField = (fieldType: FormField['type'] = 'text') => {
    const newField = createNewField(fieldType);
    setFields([...fields, newField]);
    setCurrentField(fields.length);
    setActiveTab('fields');
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates } as FormField;
    setFields(updatedFields);
  };

  const deleteField = (index: number) => {
    const updatedFields = [...fields];
    updatedFields.splice(index, 1);
    setFields(updatedFields);
    
    // Reset current field if it was the one deleted
    if (currentField === index) {
      setCurrentField(updatedFields.length > 0 ? Math.min(index, updatedFields.length - 1) : null);
    } else if (currentField && currentField > index) {
      // Adjust current field index if needed
      setCurrentField(currentField - 1);
    }
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // TODO: Implement form submission logic
      console.log('Form submitted:', { fields, settings });
      toast.success('Form saved successfully');
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error('Failed to save form');
    } finally {
      setIsSaving(false);
    }
  };

  // Render field editor based on field type
  const renderFieldEditor = (field: FormField, index: number) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'hidden':
        return (
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
                placeholder="Field label"
              />
            </div>
            <div>
              <Label>Placeholder</Label>
              <Input
                value={field.placeholder || ''}
                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                placeholder="Placeholder text"
              />
            </div>
          </div>
        );
      // Add cases for other field types...
      default:
        return <div>Field type {field.type} editor not implemented yet</div>;
    }
  };

  // Render the form builder UI
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {id ? 'Edit Form' : 'Create New Form'}
          </h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setActiveTab('preview')}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="settings">Form Settings</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="fields">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-4">
              <h3 className="font-medium">Add Field</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => addField('text')}>
                  Text
                </Button>
                <Button variant="outline" onClick={() => addField('email')}>
                  Email
                </Button>
                <Button variant="outline" onClick={() => addField('number')}>
                  Number
                </Button>
                <Button variant="outline" onClick={() => addField('textarea')}>
                  Textarea
                </Button>
                <Button variant="outline" onClick={() => addField('select')}>
                  Dropdown
                </Button>
                <Button variant="outline" onClick={() => addField('checkbox')}>
                  Checkbox
                </Button>
                <Button variant="outline" onClick={() => addField('date')}>
                  Date
                </Button>
                <Button variant="outline" onClick={() => addField('file')}>
                  File Upload
                </Button>
              </div>
            </div>

            <div className="md:col-span-3">
              {fields.length > 0 ? (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>{field.label || `Field ${index + 1}`}</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteField(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        {field.description && (
                          <CardDescription>{field.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        {renderFieldEditor(field, index)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">
                    No fields added yet. Click on a field type to get started.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Form Settings</CardTitle>
              <CardDescription>
                Configure general settings for your form
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Allowed Domains</h3>
                <div className="flex space-x-2 mb-2">
                  <Input
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="example.com"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      if (newDomain) {
                        setSettings({
                          ...settings,
                          allowedDomains: [...settings.allowedDomains, newDomain]
                        });
                        setNewDomain('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {settings.allowedDomains.map((domain, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>{domain}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updatedDomains = [...settings.allowedDomains];
                          updatedDomains.splice(index, 1);
                          setSettings({
                            ...settings,
                            allowedDomains: updatedDomains
                          });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Notification Emails</h3>
                <div className="flex space-x-2 mb-2">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      if (newEmail) {
                        setSettings({
                          ...settings,
                          notificationEmails: [...settings.notificationEmails, newEmail]
                        });
                        setNewEmail('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {settings.notificationEmails.map((email, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>{email}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updatedEmails = [...settings.notificationEmails];
                          updatedEmails.splice(index, 1);
                          setSettings({
                            ...settings,
                            notificationEmails: updatedEmails
                          });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Form Preview</CardTitle>
              <CardDescription>
                This is how your form will look to users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl mx-auto p-6 border rounded-lg">
                <h2 className="text-2xl font-bold mb-6">Form Preview</h2>
                <form className="space-y-4">
                  {fields.length > 0 ? (
                    fields.map((field, index) => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {field.type === 'textarea' ? (
                          <Textarea
                            id={field.id}
                            placeholder={field.placeholder}
                            rows={field.rows}
                            disabled
                          />
                        ) : field.type === 'select' ? (
                          <Select disabled>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((option, i) => (
                                <SelectItem key={i} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === 'checkbox' ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={field.id}
                              className="h-4 w-4"
                              disabled
                            />
                            <Label htmlFor={field.id}>Checkbox option</Label>
                          </div>
                        ) : (
                          <Input
                            id={field.id}
                            type={field.type}
                            placeholder={'placeholder' in field ? field.placeholder : undefined}
                            disabled
                          />
                        )}
                        {field.description && (
                          <p className="text-sm text-muted-foreground">
                            {field.description}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No fields added to the form yet.
                    </p>
                  )}
                  <div className="pt-4">
                    <Button type="submit" disabled={fields.length === 0}>
                      Submit
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Embed Code</CardTitle>
              <CardDescription>
                Add this form to your website using the following code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">
                    {`<iframe 
  src="${window.location.origin}/forms/${id || 'YOUR_FORM_ID'}" 
  width="100%" 
  height="500" 
  frameBorder="0" 
  style="border: 1px solid #e2e8f0; border-radius: 0.5rem;"
></iframe>`}
                  </code>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `<iframe 
  src="${window.location.origin}/forms/${id || 'YOUR_FORM_ID'}" 
  width="100%" 
  height="500" 
  frameBorder="0" 
  style="border: 1px solid #e2e8f0; border-radius: 0.5rem;"
></iframe>`
                    );
                    toast.success('Embed code copied to clipboard');
                  }}
                >
                  <Code className="mr-2 h-4 w-4" />
                  Copy Embed Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FormBuilder;
