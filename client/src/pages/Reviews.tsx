import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

export function Rating({ value }: { value: number }) {
  return (
    <span
      className="flex gap-1 text-amber-700"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          aria-hidden="true"
          className="h-5 w-5"
          fill={n <= value ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}
export default function Reviews() {
  const list = trpc.reviews.list.useQuery();
  const submit = trpc.reviews.submit.useMutation({
    onSuccess: () => setSubmitted(true),
  });
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [validation, setValidation] = useState("");
  function send(e: FormEvent) {
    e.preventDefault();
    if (!rating) {
      setValidation("Please choose a star rating.");
      return;
    }
    setValidation("");
    submit.mutate({
      publicName: name,
      rating,
      comment,
      consent: true,
      website,
    });
  }
  return (
    <main className="min-h-screen py-12 px-4">
      <div className="container max-w-4xl space-y-8">
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
        <header className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold">Reviews</h1>
          <p className="text-lg text-muted-foreground">
            Experiences shared by families who have used Ilana Cares.
          </p>
        </header>
        <Card className="p-6 md:p-8 gradient-pink">
          <h2 className="text-2xl font-bold mb-4">Share your experience</h2>
          {submitted ? (
            <div role="status" className="space-y-3">
              <p className="text-lg font-semibold">
                Thank you for your review!
              </p>
              <p>
                Your review has been submitted and will appear here after
                approval.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false);
                  setName("");
                  setRating(0);
                  setComment("");
                  setConsent(false);
                  submit.reset();
                }}
              >
                Write another review
              </Button>
            </div>
          ) : (
            <form onSubmit={send} className="space-y-5">
              <div>
                <Label htmlFor="public-name">Public display name</Label>
                <Input
                  id="public-name"
                  className="mt-2"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  maxLength={80}
                />
                <p className="text-sm mt-2">
                  Choose the name you want shown with your review.
                </p>
              </div>
              <fieldset>
                <legend className="text-sm font-medium mb-2">
                  Your rating
                </legend>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <label
                      key={n}
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${rating === n ? "bg-white border-black" : "border-gray-400"}`}
                    >
                      <input
                        type="radio"
                        name="rating"
                        value={n}
                        checked={rating === n}
                        onChange={() => setRating(n)}
                        required
                      />
                      <span>
                        {n} <span aria-hidden="true">★</span>
                        <span className="sr-only">
                          {n === 1 ? "star" : "stars"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <Label htmlFor="review-comment">Your review</Label>
                <Textarea
                  id="review-comment"
                  className="mt-2 min-h-32"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  maxLength={3000}
                  required
                />
                <p className="text-sm mt-2">
                  Please avoid including children's names or private contact
                  details.
                </p>
              </div>
              <div className="hidden" aria-hidden="true">
                <label htmlFor="review-website">Website</label>
                <input
                  id="review-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                />
              </div>
              <label className="flex gap-3 items-start text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  required
                />
                <span>
                  I agree that my display name, rating, and review may be
                  published after approval.
                </span>
              </label>
              {(validation || submit.error) && (
                <p role="alert" className="text-red-800">
                  {validation || submit.error?.message}
                </p>
              )}
              <Button
                type="submit"
                disabled={submit.isPending || !consent}
                className="nav-button gradient-blue text-black w-full"
              >
                {submit.isPending ? "Submitting…" : "Submit review"}
              </Button>
            </form>
          )}
        </Card>
        <section aria-labelledby="published-reviews" className="space-y-4">
          <h2 id="published-reviews" className="text-2xl font-bold">
            Family reviews
          </h2>
          {list.isLoading && <p role="status">Loading reviews…</p>}
          {list.error && (
            <div role="alert">
              <p>Reviews couldn't be loaded.</p>
              <Button variant="outline" onClick={() => void list.refetch()}>
                Try again
              </Button>
            </div>
          )}
          {list.data?.length === 0 && (
            <Card className="p-6 gradient-blue">
              <p>
                No reviews have been published yet. Have you used Ilana Cares?
                Share your experience above.
              </p>
            </Card>
          )}
          {list.data?.map(review => (
            <Card key={review.id} className="p-6 space-y-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-lg break-words" dir="auto">
                    {review.publicName}
                  </h3>
                  <time
                    className="text-sm text-muted-foreground"
                    dateTime={review.createdAt.toISOString()}
                  >
                    {review.createdAt.toLocaleDateString()}
                  </time>
                </div>
                <Rating value={review.rating} />
              </div>
              <p className="whitespace-pre-wrap break-words" dir="auto">
                {review.comment}
              </p>
              {review.reply && (
                <div className="border-l-4 border-pink-400 pl-4">
                  <h4 className="font-semibold">Reply from Ilana</h4>
                  <p
                    className="whitespace-pre-wrap break-words mt-2"
                    dir="auto"
                  >
                    {review.reply}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </section>
        <div className="text-center">
          <Link href="/admin/reviews" className="text-sm underline">
            Admin sign-in
          </Link>
        </div>
      </div>
    </main>
  );
}
