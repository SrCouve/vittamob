-- Delete duplicate Kaio profiles (no avatar, no followers, not the real one)
-- Real Kaio is f2cafac2-1a52-4bff-8820-99ffa79b676c
DELETE FROM profiles WHERE id IN (
  '0a66ac84-aae8-4577-a424-0318d1e6065f',
  'cdd8306f-a850-4831-92e4-f0b79559c70a'
);
