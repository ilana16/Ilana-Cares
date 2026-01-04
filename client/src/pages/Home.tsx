import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-3xl w-full text-center space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground">
            Ilana Cares
          </h1>
          <h2 className="text-2xl md:text-3xl text-muted-foreground font-medium">
            English Speaking Babysitter In the Givat Shaul & Kiryat Moshe Area
          </h2>
        </div>

        {/* Logo */}
        <div className="flex justify-center py-6">
          <img
            src="/logo.png"
            alt="Ilana Cares - Childcare with love and attention"
            className="w-64 h-64 md:w-80 md:h-80 rounded-full shadow-lg object-cover"
          />
        </div>

        {/* Navigation Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto pt-8">
          <Link href="/about">
            <Button className="nav-button w-full gradient-pink text-primary-foreground">
              About Ilana
            </Button>
          </Link>
          
          <Link href="/rates">
            <Button className="nav-button w-full gradient-blue text-secondary-foreground">
              Rates
            </Button>
          </Link>
          
          <Link href="/booking">
            <Button className="nav-button w-full gradient-purple text-muted-foreground">
              Availability & Booking
            </Button>
          </Link>
          
          <Link href="/payment">
            <Button className="nav-button w-full gradient-yellow text-accent-foreground">
              Online Payment Options
            </Button>
          </Link>
          
          <Link href="/contact">
            <Button className="nav-button w-full md:col-span-2 gradient-pink text-primary-foreground">
              Contact
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

