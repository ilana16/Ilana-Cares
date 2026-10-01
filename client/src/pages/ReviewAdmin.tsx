import { useEffect, useState } from "react";
import {
  getAuth,
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { Link } from "wouter";
import { app } from "@/lib/firebase";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { REVIEW_ADMIN_EMAIL } from "@shared/reviews";
import { Rating } from "./Reviews";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type Review =
  inferRouterOutputs<AppRouter>["reviews"]["adminList"]["items"][number];
function ReviewRow({
  review,
  token,
  refresh,
}: {
  review: Review;
  token: string;
  refresh: () => void;
}) {
  const [reply, setReply] = useState(review.reply ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setReply(review.reply ?? ""), [review.reply]);
  const options = { onSuccess: refresh };
  const moderate = trpc.reviews.moderate.useMutation(options);
  const saveReply = trpc.reviews.reply.useMutation(options);
  const remove = trpc.reviews.remove.useMutation(options);
  const busy = moderate.isPending || saveReply.isPending || remove.isPending;
  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg break-words" dir="auto">
            {review.publicName}
          </h2>
          <p className="text-sm capitalize">
            {review.status} · {review.createdAt.toLocaleDateString()}
          </p>
        </div>
        <Rating value={review.rating} />
      </div>
      <p className="text-sm break-words">
        Email (private):{" "}
        {review.email ? (
          <a href={`mailto:${review.email}`} className="underline">
            {review.email}
          </a>
        ) : (
          "Not provided on older review"
        )}
      </p>
      <p className="whitespace-pre-wrap break-words" dir="auto">
        {review.comment}
      </p>
      {!review.notificationSentAt && (
        <p className="text-sm text-amber-900">
          Email notification awaiting delivery. Automatic retries are enabled.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {review.status !== "approved" && (
          <Button
            disabled={busy}
            onClick={() =>
              moderate.mutate({ token, id: review.id, status: "approved" })
            }
          >
            Approve and publish
          </Button>
        )}
        {review.status !== "rejected" && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              moderate.mutate({ token, id: review.id, status: "rejected" })
            }
          >
            {review.status === "approved" ? "Unpublish" : "Reject"}
          </Button>
        )}
        {review.status === "rejected" && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              moderate.mutate({ token, id: review.id, status: "pending" })
            }
          >
            Return to pending
          </Button>
        )}
      </div>
      <div>
        <Label htmlFor={`reply-${review.id}`}>Public reply from Ilana</Label>
        <Textarea
          id={`reply-${review.id}`}
          className="mt-2"
          value={reply}
          onChange={e => setReply(e.target.value)}
          maxLength={3000}
        />
        <p className="text-sm mt-2 mb-3">
          Replies appear publicly only while the review is approved. Clear the
          text to remove your reply.
        </p>
        <Button
          variant="outline"
          disabled={busy || reply === (review.reply ?? "")}
          onClick={() => saveReply.mutate({ token, id: review.id, reply })}
        >
          {saveReply.isPending ? "Saving…" : "Save reply"}
        </Button>
      </div>
      {confirmDelete ? (
        <div className="space-y-3">
          <p>Delete this review permanently?</p>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => remove.mutate({ token, id: review.id })}
            >
              Delete permanently
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
        >
          Delete review
        </Button>
      )}
      {(moderate.error || saveReply.error || remove.error) && (
        <p role="alert" className="text-red-800">
          {moderate.error?.message ||
            saveReply.error?.message ||
            remove.error?.message}
        </p>
      )}
    </Card>
  );
}
export default function ReviewAdmin() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("pending");
  const auth = getAuth(app);
  const utils = trpc.useUtils();
  useEffect(
    () =>
      onIdTokenChanged(auth, async current => {
        setUser(current);
        setToken("");
        try {
          if (current?.email?.toLowerCase() === REVIEW_ADMIN_EMAIL)
            setToken(await current.getIdToken());
        } catch {
          setError("Please sign out and sign in again.");
        } finally {
          setInitializing(false);
        }
      }),
    [auth]
  );
  const list = trpc.reviews.adminList.useQuery(
    { token },
    { enabled: Boolean(token), retry: false, refetchInterval: 60000 }
  );
  async function login() {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
        login_hint: REVIEW_ADMIN_EMAIL,
      });
      await signInWithPopup(auth, provider);
    } catch {
      setError("Google sign-in couldn't be completed. Please try again.");
    }
  }
  async function logout() {
    await signOut(auth);
    setToken("");
    utils.reviews.adminList.reset();
  }
  return (
    <main className="min-h-screen py-12 px-4">
      <div className="container max-w-4xl space-y-6">
        <Link href="/reviews">
          <Button variant="outline">Back to Reviews</Button>
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold">Review dashboard</h1>
        {initializing ? (
          <p role="status">Checking sign-in…</p>
        ) : !token ? (
          <Card className="p-8 gradient-blue space-y-4">
            <p>Sign in with Ilanadevorah25@gmail.com to manage reviews.</p>
            {user && (
              <p role="alert">This Google account doesn't have admin access.</p>
            )}
            <Button onClick={() => void login()}>Sign in with Google</Button>
            {user && (
              <Button variant="outline" onClick={() => void logout()}>
                Sign out
              </Button>
            )}
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap justify-between gap-3">
              <p>Signed in as {user?.email}</p>
              <Button variant="outline" onClick={() => void logout()}>
                Sign out
              </Button>
            </div>
            {list.isLoading && <p role="status">Loading reviews…</p>}
            {list.error && (
              <div role="alert">
                <p className="text-red-800">{list.error.message}</p>
                <Button variant="outline" onClick={() => void list.refetch()}>
                  Try again
                </Button>
              </div>
            )}
            {list.data && (
              <>
                {!list.data.emailConfigured && (
                  <p role="alert" className="p-4 bg-amber-100 rounded-lg">
                    Email delivery is not configured. Reviews are saved, but
                    notifications cannot be delivered yet.
                  </p>
                )}
                <div
                  className="flex flex-wrap gap-2"
                  aria-label="Filter reviews"
                >
                  {["pending", "approved", "rejected", "all"].map(value => (
                    <Button
                      key={value}
                      variant={filter === value ? "default" : "outline"}
                      aria-pressed={filter === value}
                      onClick={() => setFilter(value)}
                      className="capitalize"
                    >
                      {value} (
                      {
                        list.data.items.filter(
                          r => value === "all" || r.status === value
                        ).length
                      }
                      )
                    </Button>
                  ))}
                </div>
                {list.data.items.filter(
                  r => filter === "all" || r.status === filter
                ).length === 0 && (
                  <p>No {filter === "all" ? "" : filter + " "}reviews.</p>
                )}
                {list.data.items
                  .filter(r => filter === "all" || r.status === filter)
                  .map(review => (
                    <ReviewRow
                      key={review.id}
                      review={review}
                      token={token}
                      refresh={() => {
                        void list.refetch();
                        void utils.reviews.list.invalidate();
                      }}
                    />
                  ))}
              </>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-red-800">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
