import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { User, Mail, HelpCircle, MessageSquare, Send, CheckCircle2, ArrowLeft } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import logo from '../../../assets/branding/logo/SLD_Logo.png';
import { contactSchema } from '../validation/contactSchema';
import { contactService } from '../services/contactService';

const TOPIC_OPTIONS = [
  'Sign-in / Login Issue',
  'Account Access & Verification',
  'Case Law & Statute Inquiries',
  'Subscription & Billing Question',
  'Technical Bug / Portal Issue',
  'General Inquiry'
];

const ContactForm = () => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: '',
      email: '',
      subject: 'Sign-in / Login Issue',
      message: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      await contactService.sendContactMessage(data);
      setSubmittedEmail(data.email);
      setIsSuccess(true);
      reset();
    } catch (err) {
      console.error('Contact submission error:', err);
      setError('root', {
        message: err.message || 'Failed to transmit your message. Please try again.'
      });
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full text-center animate-fade-in py-4">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl text-white font-medium mb-3">
            Message Sent <span className="text-brand-orange">Successfully</span>
          </h2>

          <p className="text-gray-300 text-sm leading-relaxed max-w-md mb-2">
            Thank you for reaching out. Your inquiry has been forwarded to the <strong>SLD System Administrator</strong>.
          </p>

          <p className="text-gray-400 text-xs mb-8">
            A support representative will review your request and respond to <span className="text-brand-orange font-medium">{submittedEmail}</span> shortly.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
            <Link to="/login" className="w-full">
              <Button type="button" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign in
              </Button>
            </Link>
            <Button 
              type="button" 
              variant="outline-dark" 
              className="w-full"
              onClick={() => setIsSuccess(false)}
            >
              Send Another Inquiry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col items-center text-center mb-8">
        <img 
          src={logo} 
          alt="SLD System" 
          className="h-16 md:h-[90px] mb-5 md:mb-6" 
          fetchPriority="high" 
          loading="eager" 
        />
        <h1 className="text-2xl md:text-3xl text-white mb-2 font-medium">
          Contact <span className="text-brand-orange">Support</span>
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-md">
          Having trouble signing in or have questions regarding law reports? Submit your request and our admin team will assist you.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {errors.root && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center animate-shake">
            {errors.root.message}
          </div>
        )}

        {/* Full Name Field */}
        <Input
          type="text"
          placeholder="Full Name *"
          icon={User}
          variant="dark"
          error={errors.fullName}
          {...register('fullName')}
        />

        {/* Email Address Field */}
        <Input
          type="email"
          placeholder="Email Address *"
          icon={Mail}
          variant="dark"
          error={errors.email}
          {...register('email')}
        />

        {/* Topic / Subject Select */}
        <div className="w-full">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
              <HelpCircle className="w-5 h-5" />
            </div>
            <select
              className="w-full pl-12 pr-4 py-3.5 bg-[#14151A] border border-[#262833] rounded-xl text-sm focus:outline-none focus:border-brand-orange text-white appearance-none cursor-pointer"
              {...register('subject')}
            >
              {TOPIC_OPTIONS.map((topic) => (
                <option key={topic} value={topic} className="bg-[#14151A] text-white">
                  {topic}
                </option>
              ))}
            </select>
          </div>
          {errors.subject && (
            <span className="text-xs text-red-500 mt-1 block">
              {errors.subject.message}
            </span>
          )}
        </div>

        {/* Detailed Message Textarea */}
        <div className="w-full">
          <div className="relative">
            <div className="absolute top-3.5 left-4 pointer-events-none text-gray-500">
              <MessageSquare className="w-5 h-5" />
            </div>
            <textarea
              rows={4}
              placeholder="Describe your issue or inquiry in detail... *"
              className={`w-full pl-12 pr-4 py-3 bg-[#14151A] border ${
                errors.message ? 'border-red-500' : 'border-[#262833]'
              } rounded-xl text-sm focus:outline-none focus:border-brand-orange text-white placeholder-gray-500 transition-colors resize-none`}
              {...register('message')}
            />
          </div>
          {errors.message && (
            <span className="text-xs text-red-500 mt-1 block">
              {errors.message.message}
            </span>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full mt-2" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Dispatching to Admin...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" /> Send Inquiry to Admin
            </span>
          )}
        </Button>

        <div className="text-center mt-2">
          <Link 
            to="/login" 
            className="text-xs text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign in
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ContactForm;
