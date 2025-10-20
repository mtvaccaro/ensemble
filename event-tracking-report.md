# Event tracking report

This document lists all PostHog events that have been automatically added to your Next.js application.

## Events by File

### app/(auth)/login/page.tsx

- **login_result**: Fired when a user login attempt is completed, capturing success or failure.
- **navigate_to_signup_from_login**: Fired when a user clicks the 'Sign up' link on the login page.

### app/(auth)/signup/page.tsx

- **signup-failed**: Fired when a user's attempt to sign up fails due to validation, API error, or an unexpected issue.
- **signup-successful**: Fired when a user successfully creates an account via the sign-up form.

### app/auth/callback/page.tsx

- **auth-callback-completed**: Fired when the authentication callback process finishes, indicating either success or failure.
- **auth-error-go-to-login-clicked**: Fired when a user clicks the 'Go to Login' button on the authentication error screen.

### app/page.tsx

- **cta_clicked**: User clicked a call-to-action link or button on the homepage.

### app/(dashboard)/dashboard/page.tsx

- **create_new_clip_clicked**: Fired when a user clicks the 'Create New Clip' button on the dashboard header.
- **view_recent_clip_clicked**: Fired when a user clicks the 'View' button for a specific clip in the recent clips list.
- **view_all_clips_clicked**: Fired when a user clicks the 'View all clips' button at the bottom of the recent clips list.

### app/(dashboard)/dashboard/podcasts/page.tsx

- **podcast-searched**: Fired when a user submits the podcast search form.
- **podcast-subscribed**: Fired when a user subscribes to a podcast from the search results.
- **podcast-unsubscribed**: Fired when a user unsubscribes from a podcast they were subscribed to.

### app/(dashboard)/dashboard/podcasts/[id]/page.tsx

- **podcast_episode_played**: Fired when a user clicks the play button on a podcast episode.
- **create_clip_button_clicked**: Fired when a user clicks the 'Create Clip' button for a podcast episode.

### app/podcasts/page.tsx

- **podcast_searched**: Fired when a user submits the podcast search form.
- **podcast_subscribed**: Fired when a user clicks the 'Subscribe' button for a podcast in the search results.
- **podcast_unsubscribed**: Fired when a user clicks the trash icon to unsubscribe from a podcast.

### components/podcasts/subscription-manager.tsx

- **podcast_subscriptions_refreshed_all**: Fired when the user clicks the 'Refresh All' button to update all their podcast subscriptions.
- **podcast_unsubscribed**: Fired when a user clicks the button to unsubscribe from a specific podcast.

### lib/auth-context.tsx

- **user-signed-in**: Fired when a user successfully signs in or completes the sign-up process.
- **user-signed-out**: Fired when a user explicitly signs out of their account.


## Events still awaiting implementation
- (human: you can fill these in)
---

## Next Steps

1. Review the changes made to your files
2. Test that events are being captured correctly
3. Create insights and dashboards in PostHog
4. Make a list of events we missed above. Knock them out yourself, or give this file to an agent.

Learn more about what to measure with PostHog and why: https://posthog.com/docs/new-to-posthog/getting-hogpilled
