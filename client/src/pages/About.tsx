import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Home } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container max-w-4xl">
        {/* Back to Home Button */}
        <Link href="/">
          <Button variant="outline" className="mb-8">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        {/* Header Image */}
        <div className="flex justify-center mb-8">
          <img
            src="/head.png"
            alt="Ilana smiling in front of greenery"
            className="w-64 h-64 rounded-full shadow-lg object-cover border-4 border-primary/20"
          />
        </div>

        {/* About Section */}
        <Card className="p-8 mb-8 gradient-pink">
          <h1 className="text-4xl font-bold text-center mb-6 text-primary-foreground">
            About Ilana
          </h1>
          
          <div className="prose prose-lg max-w-none text-foreground">
            <p className="text-lg leading-relaxed">
              Hi, I am Ilana.
            </p>
            <p className="text-lg leading-relaxed">
              I am a patient, responsible, 24-year-old with 10+ years of childcare experience. 
              My Hebrew needs work, but I can communicate. I completed a Hatzalah course which 
              certified me as an EMT (חובשת) in both Israel and America. I can cook meals, and 
              I keep Kosher and Shabbat. I am great at finding creative ways to keep kids engaged, 
              happy and safe. I have experience caring for high functioning special needs children, 
              and children and babies of all ages. I am also willing to do some light housework, 
              and have experience in basic home maintenance.
            </p>
          </div>
        </Card>

        {/* Certifications Section */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center text-foreground">
            Certifications
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* US EMT Certificate */}
            <Card className="p-4 gradient-blue">
              <h3 className="text-xl font-semibold mb-4 text-center text-secondary-foreground">
                United States EMT Certification
              </h3>
              <img
                src="/emt.png"
                alt="National Registry Emergency Medical Technician Certificate - Ilana D. Cunningham"
                className="w-full h-auto rounded-lg shadow-md border-2 border-secondary/30"
              />
              <p className="text-sm text-center mt-4 text-secondary-foreground">
                Registry Number: E3677439
              </p>
            </Card>

            {/* Israel EMT Certificate */}
            <Card className="p-4 gradient-purple">
              <h3 className="text-xl font-semibold mb-4 text-center text-muted-foreground">
                Israel EMT Certification (חובשת)
              </h3>
              <img
                src="/emtil.jpg"
                alt="United Hatzalah Emergency Medical Technician Certificate - Ilana Cunningham"
                className="w-full h-auto rounded-lg shadow-md border-2 border-muted/30"
              />
              <p className="text-sm text-center mt-4 text-muted-foreground">
                Certified by United Hatzalah - March 23, 2022
              </p>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center space-y-4">
          <Link href="/booking">
            <Button className="nav-button gradient-yellow text-accent-foreground">
              Book Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

