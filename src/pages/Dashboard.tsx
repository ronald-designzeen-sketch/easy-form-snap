import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newFormName, setNewFormName] = useState('');
  const [newFormEmail, setNewFormEmail] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Generate a URL-friendly slug from a string
  const generateSlug = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')      // Replace spaces with -
      .replace(/--+/g, '-')      // Replace multiple - with single -
      .trim()
      .substring(0, 50);         // Limit length
  };

  // Generate a short ID from a UUID
  const generateShortId = (uuid: string): string => {
    return uuid.split('-')[0];
  };

  // Get form URL with the new format
  const getFormUrl = (form: any) => {
    const slug = generateSlug(form.name || 'form');
    const shortId = generateShortId(form.id);
    return `/forms/${slug}-${shortId}/edit`;
  };

  const { data: forms, isLoading } = useQuery({
    queryKey: ['forms', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createFormMutation = useMutation({
    mutationFn: async () => {
      if (!newFormName.trim()) throw new Error('Form name is required');
      
      const { data, error } = await supabase
        .from('forms')
        .insert([
          {
            name: newFormName,
            owner_id: user?.id,
            notification_email: newFormEmail || user?.email,
            definition: [],
          },
        ])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast.success('Form created successfully!');
      setDialogOpen(false);
      setNewFormName('');
      setNewFormEmail('');
      navigate(`/forms/${data.id}/edit`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create form');
    },
  });

  const deleteFormMutation = useMutation({
    mutationFn: async (formId: string) => {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast.success('Form deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete form');
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Forms</h1>
            <p className="text-muted-foreground">Create and manage your forms</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="mr-2 h-4 w-4" />
                New Form
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Form</DialogTitle>
                <DialogDescription>
                  Start building your new form
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="form-name">Form Name</Label>
                  <Input
                    id="form-name"
                    placeholder="Contact Form"
                    value={newFormName}
                    onChange={(e) => setNewFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification-email">Notification Email (optional)</Label>
                  <Input
                    id="notification-email"
                    type="email"
                    placeholder="notifications@example.com"
                    value={newFormEmail}
                    onChange={(e) => setNewFormEmail(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => createFormMutation.mutate()}
                  disabled={createFormMutation.isPending}
                  className="w-full"
                >
                  {createFormMutation.isPending ? 'Creating...' : 'Create Form'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-32 bg-muted" />
              </Card>
            ))}
          </div>
        ) : forms && forms.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <Card key={form.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <FileText className="h-8 w-8 text-primary" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this form?')) {
                          deleteFormMutation.mutate(form.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <CardTitle className="mt-2">{form.name}</CardTitle>
                  <CardDescription>
                    Created {new Date(form.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link
                    key={form.id}
                    to={getFormUrl(form)}
                    className="block p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    Edit Form
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/forms/${form.id}/submissions`)}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Submissions
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No forms yet</h3>
              <p className="text-muted-foreground mb-4">Create your first form to get started</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Form
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
