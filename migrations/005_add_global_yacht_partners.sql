-- Create Global Yacht Partners client
INSERT INTO clients (name, meta_page_id, meta_access_token)
VALUES ('Global Yacht Partners', 'gyp-placeholder', 'gyp-placeholder')
ON CONFLICT DO NOTHING;

-- Set up notification settings (email to sales@globalyachtpartners.com, SMS to both numbers)
INSERT INTO notification_settings (client_id, notification_emails, notification_phones)
SELECT id, ARRAY['sales@globalyachtpartners.com'], ARRAY['+14106937337', '+16198479208', '+19544106536', '+15612516245']
FROM clients WHERE name = 'Global Yacht Partners'
ON CONFLICT (client_id) DO UPDATE
SET notification_emails = ARRAY['sales@globalyachtpartners.com'],
    notification_phones = ARRAY['+14106937337', '+16198479208', '+19544106536', '+15612516245'];

-- Connect Google Sheet as sync source
INSERT INTO sheet_sources (client_id, spreadsheet_id, gid, source_name, enabled)
SELECT id, '15mFX2aCT1BpYlFJ2cElFhxHJn1otN3xGaszwWmPT5e0', '784328680', 'GYP PBIBS Leads', true
FROM clients WHERE name = 'Global Yacht Partners'
ON CONFLICT DO NOTHING;

-- Import the 14 leads
INSERT INTO leads (meta_lead_id, client_id, name, email, phone, source, campaign, ad_name, form_name, form_responses, status, created_at)
SELECT
  v.meta_lead_id,
  c.id,
  v.name,
  v.email,
  v.phone,
  v.source::text,
  v.campaign,
  v.ad_name,
  v.form_name,
  v.form_responses::jsonb,
  'New',
  v.created_at::timestamptz
FROM clients c, (VALUES
  ('l:1736235740681683', 'JamesHarrisJr.com', 'heaterharris3244@icloud.com', '+19033438265', 'Meta', 'GYP PBIBS Private Tour - lead campaign', 'GYP PBIBS Private Tour - Ad', 'GYP PBIBS form', '[{"question":"Do you currently own a yacht?","answer":"no"},{"question":"If yes, please provide the make, year, length, and model.","answer":"Regal 42 2026 Sport model"}]', '2026-03-29T16:04:12-07:00'),
  ('l:1484179433230475', 'Marie Jeannite', 'mmichelle9123@gmail.com', '+17864162155', 'Meta', 'GYP PBIBS Private Tour - lead campaign', 'GYP PBIBS Private Tour - Ad', 'GYP PBIBS form', '[{"question":"Do you currently own a yacht?","answer":"no"},{"question":"If yes, please provide the make, year, length, and model.","answer":"N/A"}]', '2026-03-29T13:30:55-07:00'),
  ('l:1458595168984745', 'Jose', 'Jecills@email.com', '+13057429715', 'Meta', 'GYP PBIBS Private Tour - lead campaign', 'GYP PBIBS Private Tour - Ad', 'GYP PBIBS form', '[{"question":"Do you currently own a yacht?","answer":"yes"},{"question":"If yes, please provide the make, year, length, and model.","answer":"Carlota"}]', '2026-03-28T09:57:37-07:00'),
  ('l:1709410963759298', 'ffernandez', 'ffer340@gmail.com', '+13054698903', 'Instagram', 'GYP PBIBS Private Tour - lead campaign', 'GYP PBIBS Private Tour - Ad', 'GYP PBIBS form', '[{"question":"Do you currently own a yacht?","answer":"yes"},{"question":"If yes, please provide the make, year, length, and model.","answer":"Fred"}]', '2026-03-28T09:02:13-07:00'),
  ('l:1242673358055492', 'Photographer', 'rlasiw@gmail.com', '+12012494137', 'Instagram', 'GYP PBIBS Private Tour - lead campaign', 'GYP PBIBS Private Tour - Ad', 'GYP PBIBS form', '[{"question":"Do you currently own a yacht?","answer":"no"},{"question":"If yes, please provide the make, year, length, and model.","answer":"None"}]', '2026-03-27T22:50:05-07:00'),
  ('l:1421694349165071', 'ROBERT GUNTHER', 'Rwgun@yahoo.com', '+19143254471', 'Meta', 'GYP PBIBS Private Tour - lead campaign', 'GYP PBIBS Private Tour - Ad', 'GYP PBIBS form', '[{"question":"Do you currently own a yacht?","answer":"no"},{"question":"If yes, please provide the make, year, length, and model.","answer":"no"}]', '2026-03-27T19:37:54-07:00'),
  ('l:917689914478414', 'Judith Ann Goldin', 'jamsg2@msn.com', '+14843220325', 'Meta', 'GYP PBIBS Private Tour - lead campaign', 'GYP PBIBS Private Tour - Ad', 'GYP PBIBS form', '[{"question":"Do you currently own a yacht?","answer":"no"},{"question":"If yes, please provide the make, year, length, and model.","answer":"n/a"}]', '2026-03-27T19:17:37-07:00'),
  ('l:1427984398445979', 'n', 'makeaprofit@gmail.com', '+17738768760', 'Instagram', 'GYP PBIBS Private Tour - lead campaign', 'GYP PBIBS Private Tour - Ad', 'GYP PBIBS form', '[{"question":"Do you currently own a yacht?","answer":"no"},{"question":"If yes, please provide the make, year, length, and model.","answer":"If i purchase a yacht it will be not less than 86 feet"}]', '2026-03-27T14:54:44-07:00'),
  ('l:1450701306595540', 'Zuhal Karakaya Atalay', 'zuhalkarakaya@gmail.com', '+19548664949', 'Instagram', 'GYP PBIBS Private Tour - lead campaign', 'GYP PBIBS Private Tour - Ad', 'GYP PBIBS form', '[{"question":"Do you currently own a yacht?","answer":"yes"},{"question":"If yes, please provide the make, year, length, and model.","answer":"Azimut 55"}]', '2026-03-27T06:07:06-07:00'),
  ('l:1635277007898677', 'Lil', 'lihart707@gmail.com', '+18186916171', 'Instagram', 'GYP PBIBS Private Tour - lead campaign', 'GYP PBIBS Private Tour - Ad', 'GYP PBIBS form', '[{"question":"Do you currently own a yacht?","answer":"no"},{"question":"If yes, please provide the make, year, length, and model.","answer":"I dont have any"}]', '2026-03-20T00:03:50-07:00'),
  ('l:1874426496582786', 'Marcelo Chaves', 'marcelousa96@yahoo.com', '+14074595959', 'Instagram', 'GYP PBIBS Private Tour - lead campaign', 'GYP PBIBS Private Tour - Ad', 'GYP PBIBS form', '[{"question":"Do you currently own a yacht?","answer":"no"},{"question":"If yes, please provide the make, year, length, and model.","answer":"M"}]', '2026-03-19T13:23:52-07:00'),
  ('l:939871445073207', 'Shell Magnar Dahl', 'kjell.magnar.dahl.antonsen@gmail.com', '+18632891658', 'Meta', 'GYP PBIBS Private Tour - lead campaign', 'GYP PBIBS Private Tour - Ad', 'GYP PBIBS form', '[{"question":"Do you currently own a yacht?","answer":"no"},{"question":"If yes, please provide the make, year, length, and model.","answer":"-"}]', '2026-03-19T12:11:25-07:00'),
  ('l:4372702303011578', 'Dina Schmidt', 'Dinamarieschmidt@gmail.com', '+16466415454', 'Meta', 'GYP PBIBS Private Tour - lead campaign', 'GYP PBIBS Private Tour - Ad', 'GYP PBIBS form', '[{"question":"Do you currently own a yacht?","answer":"no"},{"question":"If yes, please provide the make, year, length, and model.","answer":"dont own yet"}]', '2026-03-19T10:23:12-07:00')
) AS v(meta_lead_id, name, email, phone, source, campaign, ad_name, form_name, form_responses, created_at)
WHERE c.name = 'Global Yacht Partners'
ON CONFLICT (meta_lead_id) DO NOTHING;
