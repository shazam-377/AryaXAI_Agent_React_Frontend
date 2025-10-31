'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';

const API_HTTP_URL = process.env.NEXT_PUBLIC_API_HTTP_URL;

interface SessionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  onSessionReset?: () => void;
}

export default function SessionReviewModal({
  isOpen,
  onClose,
  sessionId,
  onSessionReset,
}: SessionReviewModalProps) {
  const [review, setReview] = useState('');
  const [sessionLike, setSessionLike] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitReview = async () => {
    if (!sessionId) {
      console.error('No session ID available');
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit review
      if (review.trim()) {
        const reviewResponse = await fetch(`${API_HTTP_URL}/publishreview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            review: review,
          }),
        });

        if (!reviewResponse.ok) {
          console.error('Failed to submit review');
        }
      }

      // Submit session like/dislike
      if (sessionLike !== null) {
        const likeResponse = await fetch(`${API_HTTP_URL}/update-like-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            like: sessionLike,
          }),
        });

        if (!likeResponse.ok) {
          console.error('Failed to submit session rating');
        }
      }

      setSubmitted(true);
      
      // Close modal and reset session after 2 seconds
      setTimeout(() => {
        closeAndReset();
      }, 2000);
    } catch (error) {
      console.error('Error submitting session review:', error);
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    closeAndReset();
  };

  const closeAndReset = () => {
    // Reset modal state
    setReview('');
    setSessionLike(null);
    setSubmitted(false);
    setIsSubmitting(false);
    
    // Close modal
    onClose();
    
    // Reset chat session
    if (onSessionReset) {
      onSessionReset();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={closeAndReset}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session Review</DialogTitle>
          <DialogDescription>
            Please share your feedback about your experience with the Agent
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="text-4xl">✓</div>
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              Thank you for your feedback! Your review has been submitted.
            </p>
            <p className="text-center text-xs text-slate-500 dark:text-slate-500">
              Resetting session...
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Rating Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                How was your overall experience?
              </label>
              <div className="flex gap-3">
                <Button
                  variant={sessionLike === true ? 'default' : 'outline'}
                  size="lg"
                  className={`flex-1 h-12 rounded-xl ${
                    sessionLike === true
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'hover:bg-green-100 dark:hover:bg-green-900'
                  }`}
                  onClick={() => setSessionLike(true)}
                  disabled={isSubmitting}
                >
                  <ThumbsUp className="h-5 w-5" />
                </Button>
                <Button
                  variant={sessionLike === false ? 'default' : 'outline'}
                  size="lg"
                  className={`flex-1 h-12 rounded-xl ${
                    sessionLike === false
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'hover:bg-red-100 dark:hover:bg-red-900'
                  }`}
                  onClick={() => setSessionLike(false)}
                  disabled={isSubmitting}
                >
                  <ThumbsDown className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Review Text Area */}
            <div className="space-y-2">
              <label htmlFor="review" className="text-sm font-medium">
                Additional Feedback 
              </label>
              <Textarea
                id="review"
                placeholder="Share your thoughts, suggestions for improvement, or any issues you encountered..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                disabled={isSubmitting}
                className="min-h-24 rounded-lg border border-slate-300 dark:border-slate-700 p-3 text-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="flex-1"
              >
                Skip
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={isSubmitting || (sessionLike === null && !review.trim())}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
