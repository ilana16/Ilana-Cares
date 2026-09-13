import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Home, Clock, Users, Star, Briefcase } from "lucide-react";

export default function Rates() {
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
          <h1 className="text-5xl font-bold text-foreground mb-4">Rates</h1>
          <p className="text-xl text-muted-foreground">
            Affordable, professional childcare in Jerusalem
          </p>
        </div>

        {/* Rates Card */}
        <Card className="p-8 gradient-blue mb-8">
          <div className="space-y-6">
            {/* Regular Rate */}
            <div className="flex items-start gap-4 p-4 bg-white/50 rounded-lg">
              <div className="p-3 bg-secondary rounded-full">
                <Users className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-secondary-foreground mb-2">
                  Regular Rate
                </h3>
                <p className="text-3xl font-bold text-secondary-foreground">
                  Starting at ₪60/hour
                </p>
              </div>
            </div>

            {/* Chag / High Demand Rate */}
            <div className="flex items-start gap-4 p-4 bg-white/50 rounded-lg">
              <div className="p-3 bg-secondary rounded-full">
                <Star className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-secondary-foreground mb-2">
                  Chag / High Demand Rate
                </h3>
                <p className="text-3xl font-bold text-secondary-foreground">
                  Starting at ₪70/hour
                </p>
              </div>
            </div> 

            {/* Minimum Duration */}
            <div className="flex items-start gap-4 p-4 bg-white/50 rounded-lg">
              <div className="p-3 bg-secondary rounded-full">
                <Clock className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-secondary-foreground mb-2">
                  Minimum Duration
                </h3>
                <p className="text-2xl font-bold text-secondary-foreground">
                  2 hours
                </p>
              </div>
            </div>

            {/* Special Situations */}
            <div className="flex items-start gap-4 p-4 bg-white/50 rounded-lg">
              <div className="p-3 bg-secondary rounded-full">
                <Star className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                  <h3 className="text-xl font-semibold text-secondary-foreground mb-2">
                  Additional Care Pricing
                </h3>
                <ul className="space-y-2 text-secondary-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-secondary-foreground rounded-full"></span>
                    Very late hours
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-secondary-foreground rounded-full"></span>
                    Multiple children
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-secondary-foreground rounded-full"></span>
                    Infants
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-secondary-foreground rounded-full"></span>
                    Especially demanding care
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-secondary-foreground rounded-full"></span>
                    Dynamic situations
                  </li>
                </ul>
                <p className="mt-3 text-sm italic">
                  Rates are higher for multiple children, very late hours, infants, or especially demanding care
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Call to Action */}
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground mb-6">
            Ready to book? Check my availability and schedule your childcare.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/booking">
              <Button className="nav-button gradient-purple text-muted-foreground">
                Check Availability
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="min-h-[60px] text-lg">
                Contact for Custom Rates
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

