-- Run this once if previously listed artisans were saved with rough state-level coordinates.
-- It updates existing artisan pins to the official FixAm 9ja area coordinates.

with area_coordinates(state, area, lat, lng) as (
  values
    ('Lagos', 'Ikeja', 6.6018, 3.3515),
    ('Lagos', 'Lekki', 6.4698, 3.5852),
    ('Lagos', 'Yaba', 6.5167, 3.3833),
    ('Lagos', 'Surulere', 6.5004, 3.3555),
    ('Lagos', 'Ajah', 6.4698, 3.5675),
    ('Abuja/FCT', 'Wuse', 9.0747, 7.4702),
    ('Abuja/FCT', 'Garki', 9.0333, 7.4833),
    ('Abuja/FCT', 'Maitama', 9.0907, 7.4951),
    ('Abuja/FCT', 'Gwarinpa', 9.1099, 7.4042),
    ('Abuja/FCT', 'Lugbe', 8.994, 7.3675),
    ('Edo', 'Benin City', 6.335, 5.6037),
    ('Edo', 'Ekpoma', 6.743, 6.1403),
    ('Edo', 'Auchi', 7.0676, 6.2636),
    ('Edo', 'Uromi', 6.7, 6.3333),
    ('Ogun', 'Abeokuta', 7.1475, 3.3619),
    ('Ogun', 'Sango Ota', 6.6924, 3.2365),
    ('Ogun', 'Ijebu Ode', 6.8161, 3.9159),
    ('Ogun', 'Sagamu', 6.8322, 3.6319),
    ('Delta', 'Warri', 5.5167, 5.75),
    ('Delta', 'Asaba', 6.2006, 6.7338),
    ('Delta', 'Sapele', 5.894, 5.6767),
    ('Delta', 'Ughelli', 5.4896, 6.0041),
    ('Rivers', 'Port Harcourt', 4.8156, 7.0498),
    ('Rivers', 'Obio-Akpor', 4.8675, 7.0176),
    ('Rivers', 'Bonny', 4.4522, 7.1681),
    ('Rivers', 'Eleme', 4.7801, 7.1174)
)
update public.artisans as artisans
set
  lat = area_coordinates.lat,
  lng = area_coordinates.lng,
  updated_at = now()
from area_coordinates
where artisans.state = area_coordinates.state
  and artisans.area = area_coordinates.area;
