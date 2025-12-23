import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="mt-3 text-2xl font-bold text-foreground">Access Denied</h2>
        <p className="mt-2 text-muted-foreground">
          You don't have permission to access this page. Please contact an administrator if you believe this is an error.
        </p>
        <div className="mt-6">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="inline-flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
          <Button
            onClick={() => navigate('/')}
            className="ml-3"
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
