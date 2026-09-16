-- The requester who submitted a brief only ever heard back once, at Approve — they got
-- no signal that their brief was accepted, that design work had actually started, or that
-- the designer had submitted work for review. Adds those three notifications, reusing the
-- existing 'assigned'/'submitted' enum values for the requester's copy of those two events
-- (type isn't used for icon/branching in the UI, just stored) and adding a new 'accepted'
-- value for the brand new accept-time notification.
alter type notification_type add value if not exists 'accepted';
