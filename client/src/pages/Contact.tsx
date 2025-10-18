import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { Home, Mail, Phone, MessageSquare, CheckCircle } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitContact = trpc.contact.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Message sent successfully!");
    },
    onError: (error: any) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !phone || !message) {
      toast.error("Please fill in all fields");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    submitContact.mutate({
      name,
      email,
      phone,
      message,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen py-12 px-4 flex items-center justify-center">
        <Card className="p-12 max-w-2xl gradient-pink text-center">
          <CheckCircle className="h-24 w-24 text-primary mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4 text-primary-foreground">
            Message Sent!
          </h1>
          <p className="text-lg text-primary-foreground mb-8">
            Thank you for contacting me, {name}. I'll get back to you as soon as possible at {email}.
          </p>
          <Link href="/">
            <Button className="nav-button gradient-blue text-secondary-foreground">
              Return to Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container max-w-3xl">
        {/* Back to Home Button */}
        <Link href="/">
          <Button variant="outline" className="mb-8">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-4">Contact Me</h1>
          <p className="text-xl text-muted-foreground">
            Have questions? I'd love to hear from you!
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 gradient-blue text-center">
            <Mail className="h-12 w-12 text-secondary-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-secondary-foreground mb-2">Email</h3>
            <a 
              href="mailto:ilana.cunningham16@gmail.com"
              className="text-secondary-foreground hover:underline"
            >
              ilana.cunningham16@gmail.com
            </a>
          </Card>
          
          <Card className="p-6 gradient-purple text-center">
            <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">Phone / WhatsApp</h3>
            <a 
              href="tel:+972505298803"
              className="text-muted-foreground hover:underline"
            >
              +972-50-529-8803
            </a>
          </Card>
        </div>

        {/* Contact Form */}
        <Card className="p-8 gradient-yellow">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="h-6 w-6 text-accent-foreground" />
            <h2 className="text-2xl font-bold text-accent-foreground">Send Me a Message</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-accent-foreground">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="mt-2"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email" className="text-accent-foreground">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="mt-2"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="phone" className="text-accent-foreground">
                Phone / WhatsApp <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+972-50-123-4567"
                className="mt-2"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="message" className="text-accent-foreground">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell me how I can help you..."
                className="mt-2 min-h-32"
                required
              />
            </div>
            
            <Button
              type="submit"
              disabled={submitContact.isPending}
              className="w-full nav-button gradient-pink text-primary-foreground"
            >
              {submitContact.isPending ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </Card>

        {/* Additional Info */}
        <Card className="p-6 mt-8 gradient-blue">
          <h3 className="text-xl font-semibold text-secondary-foreground mb-4 text-center">
            Prefer to Book Directly?
          </h3>
          <p className="text-secondary-foreground text-center mb-6">
            Use our online booking system to check my availability and schedule your childcare session.
          </p>
          <div className="flex justify-center">
            <Link href="/booking">
              <Button className="nav-button gradient-purple text-muted-foreground">
                Go to Booking
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

