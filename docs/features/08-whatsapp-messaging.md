# 8. WhatsApp Messaging

The system sends customers WhatsApp messages about their cargo, including photographs of their
goods. Messages go out through Twilio, a licensed WhatsApp Business provider.

*Sending is available to administrators and managers. Accountants can view the delivery records.*

## The three kinds of message

| Message | Contains | Available when |
|---|---|---|
| **Status Update** | Where the shipment is, in words | Any time |
| **Departure Photos** | The photos taken as goods were loaded | Once the container has departed |
| **Arrival Photos** | The photos taken on arrival | Once the container has arrived |

Photo messages are only offered once the container has reached the relevant stage, so a customer
cannot be sent "departure photos" for a container still sitting in the warehouse.

## Two ways to send

### To everyone on a container
From the **shipment page**, the WhatsApp Campaigns panel shows a card per message type with the
number of customers on that container. Confirm, and the system works through them one at a time,
pausing briefly between each so the provider is not overwhelmed.

### To one customer
The same three buttons appear on the **package page** (for that package's customer) and on the
**customer page**. Useful for chasing one person without messaging the whole container.

## What each customer receives

Only their **own** photos. The system selects photos belonging to that customer's packages on that
container and at that stage — one customer never sees another's cargo.

**Each photo is sent as its own message.** WhatsApp accepts only one image per message and silently
ignores extras, so sending five photos means five messages, each checked for delivery. The first
carries the written message as a caption.

## Consent is checked every time

Before sending, the system checks that customer's permission for that message type. If they have
not opted in, the message is **skipped** and recorded as "Skipped — not opted in". See
[Customers](05-customers.md).

## Delivery records (Messaging Logs)

Every campaign is recorded: type, container, when it ran, how many recipients, and whether it
finished. Open a campaign to see, per customer:

| Result | Meaning |
|---|---|
| **Sent** | Accepted by WhatsApp |
| **Failed** | Rejected — the reason is shown |
| **Skipped — no opt-in** | The customer has not agreed to this message type |
| **Pending** | Still being processed |

Failures record the provider's explanation, so problems can be diagnosed rather than guessed at.

## Test mode

The system can be put in **test mode**, where every message is redirected to a list of staff test
numbers instead of the real customer. The message body is prefixed with the intended recipient, so
testers can see who *would* have received it. This is a configuration setting — with the list
empty, messages go to real customers.

## Limits WhatsApp imposes (not the system)

These come from WhatsApp itself and cannot be worked around:

- **The 24-hour rule.** Free-form messages only reach a customer who has messaged the business
  within the last 24 hours. Outside that window, WhatsApp requires a pre-approved template.
  Messages sent outside the window are rejected and appear as failures in the log.
- **One image per message** — handled automatically, as described above.
- **JPEG and PNG only**, maximum 5 MB per image. The system converts uploads and refuses HEIC
  photos from iPhones at the point of upload, rather than letting them fail silently later.
- The sending number must be an approved WhatsApp Business number.
