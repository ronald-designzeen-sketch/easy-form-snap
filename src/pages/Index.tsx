import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Shield, Zap } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <nav className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">FormSaaS</span>
            </div>
            <Button onClick={() => navigate('/auth')}>Get Started</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Simple, Powerful Form Builder
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Create beautiful forms, embed them anywhere, and collect submissions with built-in spam protection.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="bg-gradient-primary">
              Start Building Forms
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card p-6 rounded-lg shadow-md">
            <Zap className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground">
              Build and deploy forms in minutes. No complex setup required.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-md">
            <Shield className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Spam Protection</h3>
            <p className="text-muted-foreground">
              Built-in honeypot, rate limiting, and duplicate detection.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-md">
            <CheckCircle className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Universal Embed</h3>
            <p className="text-muted-foreground">
              Works everywhere: Webflow, WordPress, Wix, Shopify, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
