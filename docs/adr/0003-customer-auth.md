# 3. Customers log in with phone + one-time code, separate from staff auth

Date: 2026-10-11 · Status: accepted

**Decision.** Staff and platform admins are Payload `users` (email + password, multi-tenant plugin). Customers are not Payload users: they verify a 6-digit code (hashed, 5-minute expiry, 3 attempts, 5 sends/hour) and get a signed, httpOnly session cookie that is only valid for the salon that issued it.

**Why.** No passwords for customers; one person can be a customer at several salons without sharing an account; staff permissions stay simple.
