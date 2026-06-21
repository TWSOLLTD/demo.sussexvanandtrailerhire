-- ============================================================
-- Sussex Van & Trailer Hire — SEED DATA
-- Run this AFTER schema.sql, in Supabase → SQL Editor → New query.
-- It loads your fleet, the website gallery and the email templates
-- so the site is populated the moment it goes live.
-- (User accounts are NOT seeded — they're created when people sign
--  up. Make yourself admin with the line at the bottom of schema.sql.)
-- ============================================================

-- ---------- Fleet: trailers & vans ----------
insert into public.listings (category, name, blurb, description, specs, electrics, full_day, half_day, deposit, photos, available, sort) values
('trailer', 'Car Transporter',
 'Twin-axle beavertail transporter with winch — cars, classics, projects & non-runners.',
 'Our flagship beavertail car transporter. Low load angle, electric winch and a flat, full-width deck. Ideal for moving cars, classics, project vehicles and non-runners. Comes with ratchet straps and number-plate magnets. A 7-pin towing electrics and a vehicle rated to tow ~2000kg is required.',
 '{"Type":"Beavertail","Bed length":"4.5 m","Width":"2.0 m","Axles":"Twin","Max load":"2000 kg","Winch":"Electric 12V"}', '7-pin',
 65, 40, 150, array['assets/gallery/p39.webp','assets/gallery/p38.webp','assets/gallery/p11.webp'], true, 1),

('trailer', 'Large Flatbed',
 'Open twin-axle flatbed, no sides — trades, removals, building materials & awkward loads.',
 'Heavy-duty open flatbed with no sides to get in the way. Perfect for builders, landscapers and house moves — pallets, materials, furniture and awkward loads. Lashing points all round. Straps included.',
 '{"Type":"Flatbed","Bed length":"3.6 m","Width":"1.8 m","Axles":"Twin","Max load":"1500 kg"}', null,
 65, 40, 150, array['assets/gallery/p34.webp','assets/gallery/p18.webp'], true, 2),

('trailer', 'Small Box Trailer',
 'Lockable tipping box trailer — tip runs, garden waste & house clearances.',
 'A handy lockable box trailer with a tipping bed. Great for tip runs, garden waste, house clearances and general haulage. Easy to tow behind almost any car. Straps and number-plate included.',
 '{"Type":"Tipping box","Bed length":"2.4 m","Width":"1.3 m","Axles":"Single","Max load":"750 kg","Lockable":"Yes"}', null,
 30, 20, 80, array['assets/gallery/p47.webp'], true, 3),

('trailer', 'Small Caged Trailer',
 'Mesh-sided caged trailer — bulky light loads, garden & landscaping waste.',
 'Caged trailer with removable mesh sides for taller, bulky but light loads — hedge cuttings, cardboard, furniture and landscaping waste. Drop tailgate for easy loading.',
 '{"Type":"Caged","Bed length":"2.4 m","Width":"1.3 m","Cage height":"0.6 m","Axles":"Single","Max load":"750 kg"}', null,
 35, 22, 80, array['assets/gallery/p23.webp','assets/gallery/p25.webp'], true, 4),

('van', 'Medium Panel Van',
 'SWB panel van — house moves, deliveries & trade work. (Indicative — confirm spec.)',
 'Clean, reliable medium panel van for self-drive hire. Ideal for house moves, deliveries and trade work. Three seats, bulkhead and ply-lined load area. Full UK driving licence and minimum age 25 required (TBC).',
 '{"Type":"Panel van","Load length":"2.6 m","Load height":"1.7 m","Payload":"1000 kg","Seats":"3","Fuel":"Diesel"}', null,
 70, 45, 200, array[]::text[], true, 5),

('van', 'Luton Box Van + Tail Lift',
 'Luton box van with tail lift — big house moves & bulky furniture. (Indicative — confirm spec.)',
 'Spacious Luton box van with a powered tail lift — the easiest way to move a whole house or bulky furniture single-handed. Huge box capacity over the cab. Full UK driving licence and minimum age 25 required (TBC).',
 '{"Type":"Luton + tail lift","Load length":"4.0 m","Load height":"2.2 m","Payload":"1100 kg","Tail lift":"500 kg","Fuel":"Diesel"}', null,
 85, 55, 250, array[]::text[], true, 6);

-- ---------- Website gallery (the 61 marketing photos in the repo) ----------
insert into public.gallery (url, sort)
select 'assets/gallery/p' || lpad(g::text, 2, '0') || '.webp', g
from generate_series(1, 61) as g;

-- ---------- Settings row: phone + admin-editable email templates ----------
insert into public.settings (id, phone, templates) values (1, '07378 152002', $json$
{
  "approval": {
    "subject": "Booking approved — secure it with your deposit ({{item}})",
    "body": "Hi {{customer}},\n\nGood news — your request for the {{item}} on {{start}} → {{end}} ({{period}}) has been approved!\n\nTo secure your dates, please pay your refundable deposit of £{{deposit}} using the secure link below:\n{{paylink}}\n\nWe'll hold your dates for 48 hours. As soon as your deposit is paid we'll send full collection instructions.\n\nAny questions, just call or text {{phone}}.\n\nSussex Van & Trailer Hire"
  },
  "confirmation": {
    "subject": "You're all booked in — {{item}} ({{start}})",
    "body": "Hi {{customer}},\n\nPayment received, thank you — your booking is now fully confirmed:\n\n• Item: {{item}}\n• Dates: {{start}} → {{end}} ({{period}})\n• Hire: £{{price}}  ·  Deposit: £{{deposit}} (refundable)\n• {{fulfilment}}\n\n{{paymentnote}}\n{{deliverynote}}\n\nCOLLECTION\nPlease arrive at our Rustington yard at your agreed time and bring:\n  - Your driving licence (the physical card)\n  - A form of ID & proof of address\n\nWe supply ratchet straps and number-plate magnets, and we'll make sure you're set up to tow safely before you leave.\n\nRETURNING\nPlease return the item swept out and in the same condition by the agreed time so we can refund your deposit in full.\n\nAny questions at all, just call or text us on {{phone}}.\n\nThanks, and see you soon!\nSussex Van & Trailer Hire"
  },
  "reminder": {
    "subject": "Your hire ends soon — {{item}}",
    "body": "Hi {{customer}},\n\nJust a friendly reminder that your hire of the {{item}} is due back on {{end}}.\n\nBefore you return it:\n  - Give it a quick sweep out / clean\n  - Remove your straps and any belongings\n  - Return by the agreed time so we can refund your deposit in full\n\nOne more thing — we'd love to see how you got on! Log in to your account and upload a few photos and a quick review of your trip. Approved photos may even feature in our website gallery.\n\nThanks again for choosing us,\nSussex Van & Trailer Hire · {{phone}}"
  }
}
$json$::jsonb);
