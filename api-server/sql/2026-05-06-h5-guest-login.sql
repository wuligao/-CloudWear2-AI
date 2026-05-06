-- Add the H5 guest login switch to existing app config JSON.
UPDATE cw_ai_app_model_config
SET option_config = JSON_SET(
  COALESCE(NULLIF(option_config, ''), JSON_OBJECT()),
  '$.login.guestEnabled',
  TRUE
)
WHERE app_code = 'h5_outfit';
