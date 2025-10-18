import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Home, ChevronLeft, ChevronRight, Calendar, Clock, User, CheckCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz';

const JERUSALEM_TZ = 'Asia/Jerusalem';

export default function Booking() {
  const [step, setStep] = useState(1);
  const [duration, setDuration] = useState(2);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [numChildren, setNumChildren] = useState("1");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Fetch busy times from calendar
  const { data: busyTimes = [] } = trpc.booking.getBusyTimes.useQuery();

  const submitBooking = trpc.booking.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Booking request submitted successfully!");
    },
    onError: (error: any) => {
      toast.error(`Failed to submit booking: ${error.message}`);
    },
  });

  // Calculate minimum bookable date (42 hours from now in Jerusalem timezone)
  const minBookingDate = useMemo(() => {
    const nowInJerusalem = toZonedTime(new Date(), JERUSALEM_TZ);
    nowInJerusalem.setHours(nowInJerusalem.getHours() + 42);
    return formatTz(nowInJerusalem, 'yyyy-MM-dd', { timeZone: JERUSALEM_TZ });
  }, []);

  // Helper function to check if a date has any available slots
  const hasAvailableSlots = (dateString: string): boolean => {
    // Parse date in Jerusalem timezone
    const date = toZonedTime(new Date(dateString + 'T12:00:00'), JERUSALEM_TZ);
    const dayOfWeek = date.getDay();
    
    // Friday (5) and Saturday (6) are not available
    if (dayOfWeek === 5 || dayOfWeek === 6) return false;
    
    // Check all possible time slots for this date
    const slots = [];
    for (let hour = 9; hour <= 23; hour++) {
      if (hour === 9) {
        slots.push("09:30");
      } else {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < 23) {
          slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      }
    }
    
    // Check if any slot is available
    for (const slot of slots) {
      const [hours, minutes] = slot.split(':').map(Number);
      const slotStart = toZonedTime(new Date(dateString + 'T00:00:00'), JERUSALEM_TZ);
      slotStart.setHours(hours, minutes, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(slotStart.getHours() + duration, slotStart.getMinutes(), 0, 0);
      
      // Check if slot end time exceeds 11:30pm
      const maxEndTime = toZonedTime(new Date(dateString + 'T00:00:00'), JERUSALEM_TZ);
      maxEndTime.setHours(23, 30, 0, 0);
      if (slotEnd > maxEndTime) continue;
      
      // Check if slot conflicts with any busy time (with 1-hour buffer)
      let hasConflict = false;
      for (const busy of busyTimes) {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        
        const bufferStart = new Date(busyStart);
        bufferStart.setHours(bufferStart.getHours() - 1);
        
        const bufferEnd = new Date(busyEnd);
        bufferEnd.setHours(bufferEnd.getHours() + 1);
        
        if (slotStart < bufferEnd && slotEnd > bufferStart) {
          hasConflict = true;
          break;
        }
      }
      
      if (!hasConflict) return true;
    }
    
    return false;
  };

  // Generate available time slots
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    
    // Parse date in Jerusalem timezone
    const date = toZonedTime(new Date(selectedDate + 'T12:00:00'), JERUSALEM_TZ);
    const dayOfWeek = date.getDay();
    
    // Friday (5) and Saturday (6) are not available
    if (dayOfWeek === 5 || dayOfWeek === 6) return [];
    
    // Sunday-Thursday: 9:30am - 11:30pm
    const slots = [];
    for (let hour = 9; hour <= 23; hour++) {
      if (hour === 9) {
        slots.push("09:30");
      } else {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < 23) {
          slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      }
    }
    
    // Filter out slots that don't fit duration or conflict with busy times (with 1-hour buffer)
    return slots.filter(slot => {
      const [hours, minutes] = slot.split(':').map(Number);
      const slotStart = toZonedTime(new Date(selectedDate + 'T00:00:00'), JERUSALEM_TZ);
      slotStart.setHours(hours, minutes, 0, 0);
      
      // Calculate slot end time based on selected duration
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(slotStart.getHours() + duration, slotStart.getMinutes(), 0, 0);
      
      // Check if slot end time exceeds 11:30pm
      const maxEndTime = toZonedTime(new Date(selectedDate + 'T00:00:00'), JERUSALEM_TZ);
      maxEndTime.setHours(23, 30, 0, 0);
      if (slotEnd > maxEndTime) return false;
      
      // Check if slot conflicts with any busy time (with 1-hour buffer before and after)
      for (const busy of busyTimes) {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        
        // Add 1-hour buffer: busy time blocks from (start - 1hr) to (end + 1hr)
        const bufferStart = new Date(busyStart);
        bufferStart.setHours(bufferStart.getHours() - 1);
        
        const bufferEnd = new Date(busyEnd);
        bufferEnd.setHours(bufferEnd.getHours() + 1);
        
        // Check if slot overlaps with buffered busy time
        // Slot is unavailable if: slotStart < bufferEnd AND slotEnd > bufferStart
        if (slotStart < bufferEnd && slotEnd > bufferStart) {
          return false;
        }
      }
      
      return true;
    });
  }, [selectedDate, duration, busyTimes]);

  const handleNext = () => {
    if (step === 1 && duration >= 2 && duration <= 10) {
      setStep(2);
    } else if (step === 2 && selectedDate) {
      setStep(3);
    } else if (step === 3 && selectedTime) {
      setStep(4);
    }
  };

  const handleSubmit = () => {
    if (!fullName || !email || !phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    submitBooking.mutate({
      date: selectedDate,
      startTime: selectedTime,
      duration,
      fullName,
      email,
      phone,
      numChildren: parseInt(numChildren),
      additionalInfo,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen py-12 px-4 flex items-center justify-center">
        <Card className="p-12 max-w-2xl gradient-pink text-center">
          <CheckCircle className="h-24 w-24 text-primary mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4 text-primary-foreground">
            Booking Request Received!
          </h1>
          <div className="space-y-4 text-lg text-primary-foreground mb-8">
            <p className="font-semibold">Thank you for your booking request.</p>
            <div className="bg-white/50 p-6 rounded-lg space-y-2 text-left">
              <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString()}</p>
              <p><strong>Start Time:</strong> {selectedTime}</p>
              <p><strong>Duration:</strong> {duration} hours</p>
              <p><strong>Name:</strong> {fullName}</p>
              <p><strong>Email:</strong> {email}</p>
              <p><strong>Phone:</strong> {phone}</p>
              <p><strong>Number of Children:</strong> {numChildren}</p>
            </div>
            <p className="text-base italic">
              Ilana will contact you soon to confirm your booking.
            </p>
          </div>
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
        <Link href="/">
          <Button variant="outline" className="mb-8">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-5xl font-bold text-center mb-4">Availability & Booking</h1>
        
        {/* General Hours */}
        <Card className="p-6 mb-8 gradient-yellow">
          <h2 className="text-2xl font-semibold mb-4 text-accent-foreground">General Weekly Hours</h2>
          <div className="grid md:grid-cols-2 gap-4 text-accent-foreground">
            <div className="flex justify-between items-center p-3 bg-white/50 rounded">
              <span className="font-medium">Sunday - Thursday:</span>
              <span>9:30am - 11:30pm</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/50 rounded">
              <span className="font-medium">Friday:</span>
              <span className="text-destructive font-semibold">Not Available</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/50 rounded md:col-span-2">
              <span className="font-medium">Saturday:</span>
              <span className="text-destructive font-semibold">Not Available</span>
            </div>
          </div>
          <p className="mt-4 text-sm italic text-accent-foreground">
            Note: Bookings require at least 42 hours advance notice
          </p>
        </Card>

        {/* Booking Form */}
        <Card className="p-8 gradient-blue">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-bold text-secondary-foreground">Book Your Session</h2>
              <span className="text-sm text-secondary-foreground">Step {step} of 4</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-2">
              <div 
                className="bg-secondary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* Step 1: Duration */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-6 w-6 text-secondary-foreground" />
                <h3 className="text-xl font-semibold text-secondary-foreground">Select Duration</h3>
              </div>
              <div className="space-y-4">
                <Label htmlFor="duration" className="text-lg text-secondary-foreground">
                  How many hours do you need? (2-10 hours)
                </Label>
                <div className="flex items-center gap-4">
                  <input
                    id="duration"
                    type="range"
                    min="2"
                    max="10"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="flex-1 h-3 bg-white/50 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-3xl font-bold text-secondary-foreground w-20 text-center">
                    {duration}h
                  </span>
                </div>
                <p className="text-sm text-secondary-foreground">
                  Base rate: ₪{50 * duration} ({duration} hours × ₪50/hour)
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Date */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="h-6 w-6 text-secondary-foreground" />
                <h3 className="text-xl font-semibold text-secondary-foreground">Select Date</h3>
              </div>
              <div className="space-y-4">
                <Label htmlFor="date" className="text-lg text-secondary-foreground">
                  Choose a date (at least 42 hours in advance)
                </Label>
                <Input
                  id="date"
                  type="date"
                  min={minBookingDate}
                  value={selectedDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setSelectedDate(newDate);
                    // Reset selected time when date changes
                    setSelectedTime("");
                  }}
                  className="text-lg p-6"
                />
                {selectedDate && (new Date(selectedDate).getDay() === 5 || new Date(selectedDate).getDay() === 6) && (
                  <p className="text-destructive font-semibold">
                    Sorry, I'm not available on Fridays and Saturdays.
                  </p>
                )}
                {selectedDate && !hasAvailableSlots(selectedDate) && new Date(selectedDate).getDay() !== 5 && new Date(selectedDate).getDay() !== 6 && (
                  <p className="text-destructive font-semibold">
                    No available time slots for this date with {duration}-hour duration. Please try a different date or adjust the duration.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Time */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-6 w-6 text-secondary-foreground" />
                <h3 className="text-xl font-semibold text-secondary-foreground">Select Start Time</h3>
              </div>
              <div className="space-y-4">
                <Label className="text-lg text-secondary-foreground">
                  Available time slots for {new Date(selectedDate).toLocaleDateString()}
                </Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-2">
                  {availableTimeSlots.map((slot) => (
                    <Button
                      key={slot}
                      variant={selectedTime === slot ? "default" : "outline"}
                      onClick={() => setSelectedTime(slot)}
                      className="h-12"
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
                {availableTimeSlots.length === 0 && (
                  <p className="text-destructive">No available time slots for this date and duration.</p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Personal Info */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="h-6 w-6 text-secondary-foreground" />
                <h3 className="text-xl font-semibold text-secondary-foreground">Your Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-secondary-foreground">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-secondary-foreground">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone" className="text-secondary-foreground">
                    Phone / WhatsApp (with country code) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+972-50-123-4567"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="numChildren" className="text-secondary-foreground">
                    Number of Children <span className="text-destructive">*</span>
                  </Label>
                  <Select value={numChildren} onValueChange={setNumChildren}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="additionalInfo" className="text-secondary-foreground">
                    Additional Information (Optional)
                  </Label>
                  <Textarea
                    id="additionalInfo"
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="Any special requirements, allergies, or information I should know..."
                    className="mt-2 min-h-24"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-secondary/30">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="min-h-[50px]"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
            )}
            {step < 4 ? (
              <Button
                onClick={handleNext}
                disabled={
                  (step === 1 && (duration < 2 || duration > 10)) ||
                  (step === 2 && (!selectedDate || new Date(selectedDate).getDay() === 5 || new Date(selectedDate).getDay() === 6)) ||
                  (step === 3 && !selectedTime)
                }
                className="ml-auto min-h-[50px] gradient-purple text-muted-foreground"
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitBooking.isPending}
                className="ml-auto min-h-[50px] gradient-pink text-primary-foreground"
              >
                {submitBooking.isPending ? "Submitting..." : "Submit Booking Request"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

