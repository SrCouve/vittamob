-- Fake runs for Kaio Jansen (0a66ac84) with real polylines to test route preview
-- These polylines are from real runs in São Paulo area

INSERT INTO strava_awarded_runs (user_id, strava_activity_id, activity_name, activity_date, distance_km, moving_time_seconds, average_speed, sparks_awarded, workout_type, summary_polyline)
VALUES
  -- 5km run in Ibirapuera
  ('0a66ac84-aae8-4577-a424-0318d1e6065f', 99990001, 'Corrida Ibirapuera', '2026-03-16T07:30:00', 5.2, 1620, 3.21, 5, 0,
   'pvn~CdkulGcAyBgA{CkAmD_AiCw@qBo@}Ak@sAc@_Aa@{@]y@Yw@Uu@Qs@Ms@Iq@Es@Cs@?s@Bs@@q@Do@Fm@Hm@Lk@Ni@Rg@Te@Xc@Za@^_@b@]d@Yf@Wh@Sj@Ol@Kn@Gp@Cr@@t@Dt@Hv@Lv@Pt@Tr@Xp@\\n@`@l@b@j@f@h@h@d@l@b@n@^p@Zr@Vt@Rv@Nx@Jz@F|@B|@@|@C|@E|@I|@Mz@Qx@Uv@Yt@]r@a@p@c@n@g@l@i@h@m@f@o@b@q@^s@Zu@Vw@Ry@N{@J}@F}@B'),

  -- 10km morning run
  ('0a66ac84-aae8-4577-a424-0318d1e6065f', 99990002, 'Corrida matinal 10K', '2026-03-15T06:00:00', 10.1, 3120, 3.24, 10, 0,
   'xrn~ChjulGkBaDwBcDsBiC_BiCcBaDgBkDmBqDqB{DuBaEyBgEcCmEgCsEkCyEoCeF{CqFaD}FgDcGmDkGoD_HuDkHaEqHgEyHmEcIsEkIaFuIgF}ImFcJsEsI}DaIkDmHaDcHqC_HgCyGcCuGcC{GiCgHoCwHuCgIaCiIgCwI{BkIuBqIkBkImBsIgBwIaBeIyA}HgAoHw@sGuA}HaBaIeBqIiBcIeB_IgBcIkBaIoBcIwBoI{BqIcCuIiCsIqCyI'),

  -- 3km easy run
  ('0a66ac84-aae8-4577-a424-0318d1e6065f', 99990003, 'Trote leve', '2026-03-14T18:00:00', 3.1, 1080, 2.87, 3, 0,
   'dvn~CdkulGaA}@gAaBmAcBsAkBwAmB}AuBcBwBiBaBqB}AyBuAcCkAiCaAoCq@uCg@{CY_DSeDMiDGmD?oDBqDHsDNoD'),

  -- 7km race pace
  ('0a66ac84-aae8-4577-a424-0318d1e6065f', 99990004, 'Pace de prova', '2026-03-13T06:30:00', 7.3, 2100, 3.48, 7, 1,
   'bwn~CfkulGiBkLsDgKuCkJaCeIgBiHaBkGqAoFoAsEsAmDwAeC}AaByAcAmBo@qBg@uBa@yBUaCS_CK_CG}BCeCAwC?wCByC@{CDyC'),

  -- 15km long run
  ('0a66ac84-aae8-4577-a424-0318d1e6065f', 99990005, 'Longão domingo', '2026-03-12T05:30:00', 15.4, 5400, 2.85, 15, 0,
   'rvn~CdkulGsEoJaDcIuC}GqCsGoCkGmCeGkCcGiC_GiCaGmCeGqCoGwCyGaCeH{BqHsBcIiB}IaB{J}@kKw@aLo@uLg@gM_@yMW}MQeNIcNAaN?_NBcNHaNPaNZ}Mf@{Mp@yMx@uMbAqMhAmMpAiMtAeMzA_MbBwLhBsLnBkLtBeLzB_LbCwKjCqKpCgKxC_KbDwJlDoJ'),

  -- Also add for the other Kaio (cdd8)
  ('cdd8306f-a850-4831-92e4-f0b79559c70a', 99990006, 'Corrida no parque', '2026-03-16T08:00:00', 6.8, 2040, 3.33, 6, 0,
   'pvn~CdkulGcAyBgA{CkAmD_AiCw@qBo@}Ak@sAc@_Aa@{@]y@Yw@Uu@Qs@Ms@Iq@Es@Cs@?s@Bs@@q@Do@Fm@Hm@Lk@Ni@Rg@Te@Xc@Za@^_@b@]d@Yf@Wh@Sj@Ol@Kn@Gp@Cr@@t@Dt@Hv@Lv@Pt@Tr@Xp@\\n@`@l@b@j@f@h@h@d@l@b@n@^p@Zr@Vt@Rv@Nx@Jz@F|@B|@@|@C|@E|@I|@Mz@Qx@Uv@Yt@]r@a@p@c@n@g@l@');
