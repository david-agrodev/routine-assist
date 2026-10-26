# Routine Assist push notifications

Required Supabase secrets:

```powershell
supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." VAPID_SUBJECT="mailto:..."
```

Deploy with:

```powershell
supabase functions deploy send-routine-notifications
```

Invoke the function from Supabase Cron once per day using the service-role
authorization header. The function sends only pending trip logistics alerts and
deduplicates each alert threshold in `push_delivery_log`.
