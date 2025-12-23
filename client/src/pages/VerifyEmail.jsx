import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, CheckCircle, ArrowLeft, Mail } from 'lucide-react';
import Button from '@/components/ui/Button';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, resendVerificationEmail } = useAuth();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error', 'resend_success'
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token || !email) {
        setStatus('error');
        setError('Invalid verification link. Please check your email for the correct link.');
        return;
      }

      try {
        // TODO: Replace with actual API call
        // await verifyEmail(token, email);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStatus('success');
      } catch (err) {
        console.error('Email verification failed:', err);
        setStatus('error');
        setError(err.message || 'Failed to verify email. The link may have expired or is invalid.');
      }
    };

    verifyToken();
  }, [token, email]);

  const handleResendEmail = async () => {
    if (!email) {
      setError('Email address is required to resend verification.');
      return;
    }

    try {
      setIsResending(true);
      // TODO: Replace with actual API call
      // await resendVerificationEmail(email);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus('resend_success');
    } catch (err) {
      console.error('Failed to resend verification email:', err);
      setError(err.message || 'Failed to resend verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <h3 className="text-lg font-medium text-foreground mb-2">Verifying your email...</h3>
            <p className="text-muted-foreground text-center">Please wait while we verify your email address.</p>
          </div>
        );
      
      case 'success':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Email Verified Successfully!</h3>
            <p className="text-muted-foreground mb-6">
              Thank you for verifying your email address. You can now access all features of our platform.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Continue to Login
            </Button>
          </div>
        );
      
      case 'resend_success':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Verification Email Sent</h3>
            <p className="text-muted-foreground mb-6">
              We've sent a new verification link to <span className="font-medium">{email}</span>. Please check your inbox and follow the instructions to verify your email.
            </p>
            <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
              Back to Login
            </Button>
          </div>
        );
      
      case 'error':
      default:
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Verification Failed</h3>
            <p className="text-muted-foreground mb-6">
              {error || 'There was an error verifying your email address. The link may have expired or is invalid.'}
            </p>
            {email && (
              <Button 
                onClick={handleResendEmail} 
                disabled={isResending}
                className="w-full mb-3"
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => navigate('/login')} 
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Email Verification</h1>
          <p className="text-muted-foreground mt-2">
            {status === 'verifying' 
              ? 'Please wait while we verify your email...'
              : status === 'success'
                ? 'Your email has been verified!'
                : 'Complete your account setup'}
          </p>
        </div>
        
        <div className="bg-card p-8 rounded-lg shadow-sm border">
          {renderContent()}
        </div>
        
        <p className="text-center text-sm text-muted-foreground">
          Having trouble? Contact our support at{' '}
          <a href="mailto:support@crowdbeat.com" className="text-primary hover:underline">
            support@crowdbeat.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
