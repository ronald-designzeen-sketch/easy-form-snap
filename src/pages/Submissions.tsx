import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const Submissions = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: form } = useQuery({
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

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['submissions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('form_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const exportToCSV = () => {
    if (!submissions || submissions.length === 0) {
      toast.error('No submissions to export');
      return;
    }

    const headers = ['ID', 'Date', 'Is Spam', ...Object.keys(submissions[0].payload as object)];
    const rows = submissions.map(sub => [
      sub.id,
      new Date(sub.created_at).toLocaleString(),
      sub.is_spam ? 'Yes' : 'No',
      ...Object.values(sub.payload as object).map(v => JSON.stringify(v))
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions-${id}-${Date.now()}.csv`;
    a.click();
    
    toast.success('CSV exported successfully!');
  };

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
            <div>
              <h1 className="text-2xl font-bold">{form?.name} - Submissions</h1>
              <p className="text-muted-foreground">
                {submissions?.length || 0} total submission{submissions?.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button onClick={exportToCSV} disabled={!submissions || submissions.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>View and manage form submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading submissions...</p>
            ) : submissions && submissions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          {new Date(submission.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {submission.is_spam ? (
                            <Badge variant="destructive" className="flex items-center w-fit">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Spam
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-accent">Valid</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <pre className="text-xs max-w-md overflow-auto">
                            {JSON.stringify(submission.payload, null, 2)}
                          </pre>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {submission.ip || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No submissions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Submissions;
