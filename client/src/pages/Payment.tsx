import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Home, Copy, Check, CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Payment() {
  const [copiedBit, setCopiedBit] = useState(false);
  const [copiedPaybox, setCopiedPaybox] = useState(false);

  const paymentNumber = "0505298803";

  const copyToClipboard = (text: string, type: 'bit' | 'paybox') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'bit') {
        setCopiedBit(true);
        setTimeout(() => setCopiedBit(false), 2000);
      } else {
        setCopiedPaybox(true);
        setTimeout(() => setCopiedPaybox(false), 2000);
      }
      toast.success(`${type === 'bit' ? 'Bit' : 'Paybox'} number copied to clipboard!`);
    });
  };

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
          <h1 className="text-5xl font-bold text-foreground mb-4">Online Payment Options</h1>
          <p className="text-xl text-muted-foreground">
            Convenient payment methods for your childcare services
          </p>
        </div>

        {/* Important Note */}
        <Card className="p-6 mb-8 gradient-yellow">
          <p className="text-lg text-accent-foreground text-center">
            <strong>Note:</strong> Payments are arranged after booking confirmation. 
            Please book your session first, and I'll confirm the details with you before payment.
          </p>
        </Card>

        {/* Payment Options */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Bit Payment */}
          <Card className="p-8 gradient-pink">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-primary rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-primary-foreground">B</span>
              </div>
              <h2 className="text-3xl font-bold text-primary-foreground">Bit</h2>
              <div className="bg-white/50 p-6 rounded-lg">
                <p className="text-sm text-primary-foreground mb-2">Bit Number:</p>
                <p className="text-3xl font-bold text-primary-foreground font-mono">
                  {paymentNumber}
                </p>
              </div>
              <Button
                onClick={() => copyToClipboard(paymentNumber, 'bit')}
                className="w-full nav-button gradient-blue text-secondary-foreground"
              >
                {copiedBit ? (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-5 w-5" />
                    Copy Bit Number
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Paybox Payment */}
          <Card className="p-8 gradient-purple">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-muted-foreground">P</span>
              </div>
              <h2 className="text-3xl font-bold text-muted-foreground">Paybox</h2>
              <div className="bg-white/50 p-6 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Paybox Number:</p>
                <p className="text-3xl font-bold text-muted-foreground font-mono">
                  {paymentNumber}
                </p>
              </div>
              <Button
                onClick={() => copyToClipboard(paymentNumber, 'paybox')}
                className="w-full nav-button gradient-blue text-secondary-foreground"
              >
                {copiedPaybox ? (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-5 w-5" />
                    Copy Paybox Number
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Stripe Payment */}
          <Card className="p-8 gradient-green">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-accent rounded-full flex items-center justify-center">
                <CreditCard className="h-10 w-10 text-accent-foreground" />
              </div>
              <h2 className="text-3xl font-bold text-accent-foreground">Credit Card</h2>
              <div className="bg-white/50 p-6 rounded-lg">
                <p className="text-sm text-accent-foreground mb-2">Secure Online Payment</p>
                <p className="text-lg text-accent-foreground">
                  Pay with any credit or debit card
                </p>
              </div>
              <a
                href="https://buy.stripe.com/3cIfZh1gy8SpbKVdM6grS00"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full nav-button gradient-blue text-secondary-foreground">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Pay with Card
                </Button>
              </a>
            </div>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="p-8 gradient-blue mb-8">
          <h3 className="text-2xl font-bold text-secondary-foreground mb-6 text-center">
            How Payment Works
          </h3>
          <div className="space-y-4 text-secondary-foreground">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground font-bold">
                1
              </div>
              <p className="pt-1">
                <strong>Book your session</strong> using the booking form
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground font-bold">
                2
              </div>
              <p className="pt-1">
                <strong>Wait for confirmation</strong> - I'll contact you to confirm the details
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground font-bold">
                3
              </div>
              <p className="pt-1">
                <strong>Make payment</strong> using Bit or Paybox with the number above
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground font-bold">
                4
              </div>
              <p className="pt-1">
                <strong>Enjoy quality childcare</strong> with peace of mind!
              </p>
            </div>
          </div>
        </Card>

        {/* Call to Action */}
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground mb-6">
            Questions about payment? Feel free to contact me.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/booking">
              <Button className="nav-button gradient-pink text-primary-foreground">
                Book Now
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="min-h-[60px] text-lg">
                Contact Me
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

