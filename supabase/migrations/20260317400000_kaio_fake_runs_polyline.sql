-- Fake runs for Kaio Jansen (f2cafac2) with polylines to test route preview

INSERT INTO strava_awarded_runs (user_id, strava_activity_id, activity_name, activity_date, distance_km, moving_time_seconds, average_speed, sparks_awarded, workout_type, summary_polyline)
VALUES
  ('f2cafac2-1a52-4bff-8820-99ffa79b676c', 99990001, 'Corrida Ibirapuera', '2026-03-16T07:30:00', 5.2, 1620, 3.21, 5, 0,
   'pvn~CdkulGcAyBgA{CkAmD_AiCw@qBo@}Ak@sAc@_Aa@{@]y@Yw@Uu@Qs@Ms@Iq@Es@Cs@?s@Bs@@q@Do@Fm@Hm@Lk@Ni@Rg@Te@Xc@Za@^_@b@]d@Yf@Wh@Sj@Ol@Kn@Gp@Cr@@t@Dt@Hv@Lv@Pt@Tr@Xp@\\n@`@l@b@j@f@h@h@d@l@b@n@^p@Zr@Vt@Rv@Nx@Jz@F|@B|@@|@C|@E|@I|@Mz@Qx@Uv@Yt@]r@a@p@c@n@g@l@i@h@m@f@o@b@q@^s@Zu@Vw@Ry@N{@J}@F}@B'),

  ('f2cafac2-1a52-4bff-8820-99ffa79b676c', 99990002, 'Corrida matinal 10K', '2026-03-15T06:00:00', 10.1, 3120, 3.24, 10, 0,
   'xrn~ChjulGkBaDwBcDsBiC_BiCcBaDgBkDmBqDqB{DuBaEyBgEcCmEgCsEkCyEoCeF{CqFaD}FgDcGmDkGoD_HuDkHaEqHgEyHmEcIsEkIaFuIgF}ImFcJsEsI}DaIkDmHaDcHqC_HgCyGcCuGcC{GiCgHoCwHuCgIaCiIgCwI{BkIuBqIkBkImBsIgBwIaBeIyA}HgAoHw@sGuA}HaBaIeBqIiBcIeB_IgBcIkBaIoBcIwBoI{BqIcCuIiCsIqCyI'),

  ('f2cafac2-1a52-4bff-8820-99ffa79b676c', 99990003, 'Trote leve', '2026-03-14T18:00:00', 3.1, 1080, 2.87, 3, 0,
   'dvn~CdkulGaA}@gAaBmAcBsAkBwAmB}AuBcBwBiBaBqB}AyBuAcCkAiCaAoCq@uCg@{CY_DSeDMiDGmD?oDBqDHsDNoD'),

  ('f2cafac2-1a52-4bff-8820-99ffa79b676c', 99990004, 'Pace de prova', '2026-03-13T06:30:00', 7.3, 2100, 3.48, 7, 1,
   'bwn~CfkulGiBkLsDgKuCkJaCeIgBiHaBkGqAoFoAsEsAmDwAeC}AaByAcAmBo@qBg@uBa@yBUaCS_CK_CG}BCeCAwC?wCByC@{CDyC'),

  ('f2cafac2-1a52-4bff-8820-99ffa79b676c', 99990005, 'Longão domingo', '2026-03-12T05:30:00', 15.4, 5400, 2.85, 15, 0,
   'rvn~CdkulGsEoJaDcIuC}GqCsGoCkGmCeGkCcGiC_GiCaGmCeGqCoGwCyGaCeH{BqHsBcIiB}IaB{J}@kKw@aLo@uLg@gM_@yMW}MQeNIcNAaN?_NBcNHaNPaNZ}Mf@{Mp@yMx@uMbAqMhAmMpAiMtAeMzA_MbBwLhBsLnBkLtBeLzB_LbCwKjCqKpCgKxC_KbDwJlDoJ');
