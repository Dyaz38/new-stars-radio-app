# ✅ Country/Nation Targeting Feature Added!

I've successfully added **country-level geographic targeting** to your ad manager system!

---

## What Was Added

### 1. **Backend Changes**

#### Database:
- Added `target_countries` field to `campaigns` table (JSONB array)
- Stores ISO 3166-1 alpha-2 country codes (e.g., `['NA', 'ZA', 'US']`)
- Database migration created: `002_add_target_countries.py`

#### Models:
- `Campaign` model now includes `target_countries` field
- Supports array of 2-letter country codes

#### API:
- `AdRequest` schema now accepts `country` in location data
- Ad selection algorithm filters by country (highest priority)
- Geographic targeting hierarchy: Country → City → State

#### Ad Selection Logic:
- Campaign matches if:
  1. No targeting specified (shows to everyone), OR
  2. Country matches `target_countries`, OR
  3. City matches `target_cities`, OR
  4. State matches `target_states`

### 2. **Admin Panel Changes**

#### Campaign Form:
- New field: **"Target Countries (comma-separated, 2-letter codes)"**
- Placeholder: `e.g., NA, ZA, US (Namibia, South Africa, USA)`
- Help text: "Use ISO 3166-1 alpha-2 codes"
- Automatically converts to uppercase
- Updates placeholders for cities/states to be more relevant (Windhoek, Khomas, etc.)

#### Campaign Display:
- Shows country count in targeting summary
- Example: "2 countries, 3 cities, 1 state"

### 3. **Radio App Changes**

#### AdBanner Component:
- New prop: `country?: string`
- Passes country code to ad request API
- Example usage: `<AdBanner country="NA" />`

#### Default Setup:
- App.tsx updated to pass `country="NA"` (Namibia)
- Can be changed or detected dynamically

---

## How to Use

### For Namibian-Only Campaigns

When creating a campaign in the admin panel:

1. **Target Countries**: `NA`
2. **Target Cities**: Leave empty (or specify: `Windhoek, Swakopmund`)
3. **Target States**: Leave empty (or specify regions: `Khomas, Erongo`)

This campaign will **only show to users in Namibia**.

### For Multi-Country Campaigns

**Example: Target Southern Africa**
- **Target Countries**: `NA, ZA, BW` (Namibia, South Africa, Botswana)

**Example: Target All English-Speaking Countries**
- **Target Countries**: `US, GB, CA, AU, NZ, ZA, NA`

### For Global Campaigns

Leave all targeting fields empty - the campaign will show to everyone worldwide.

---

## Country Codes Reference

### African Countries (Examples)
```
NA - Namibia
ZA - South Africa
BW - Botswana
ZW - Zimbabwe
ZM - Zambia
AO - Angola
KE - Kenya
NG - Nigeria
GH - Ghana
EG - Egypt
```

### Other Common Countries
```
US - United States
GB - United Kingdom
CA - Canada
AU - Australia
NZ - New Zealand
DE - Germany
FR - France
BR - Brazil
IN - India
CN - China
```

**Full list**: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2

---

## How It Works

### 1. User Visits Radio App

```typescript
// In app/src/App.tsx
<AdBanner country="NA" />
```

### 2. Ad Request Sent to Backend

```json
{
  "user_id": "user_abc123",
  "placement": "banner_top",
  "location": {
    "country": "NA",
    "city": "Windhoek",
    "state": "Khomas"
  }
}
```

### 3. Backend Filters Campaigns

- Gets all active campaigns with budget
- Filters by date range
- **Filters by geographic targeting:**
  - If campaign has `target_countries = ['NA', 'ZA']`, only users from Namibia or South Africa see it
  - If campaign has no targeting, everyone sees it
- Sorts by priority
- Returns matching ad

### 4. Ad Displayed to User

- If match found: Shows your ad
- If no match: Falls back to AdSense (or shows nothing)

---

## Advanced: Dynamic Country Detection

For production, you might want to detect the user's country automatically instead of hardcoding "NA".

### Option 1: IP Geolocation API

```typescript
// In app/src/App.tsx or a custom hook

const [userCountry, setUserCountry] = useState('NA'); // Default to Namibia

useEffect(() => {
  // Fetch user's country from IP
  fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(data => {
      setUserCountry(data.country_code); // e.g., 'NA', 'US', 'ZA'
    })
    .catch(() => {
      setUserCountry('NA'); // Fallback to Namibia on error
    });
}, []);

// Then use it:
<AdBanner country={userCountry} />
```

### Option 2: Browser Geolocation API

```typescript
const [userCountry, setUserCountry] = useState('NA');

useEffect(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Reverse geocode to get country
        // (requires a geocoding service)
      }
    );
  }
}, []);
```

### Recommended Free IP Geolocation Services
- **ipapi.co** (free: 1,000 requests/day)
- **ip-api.com** (free: 45 requests/minute)
- **freegeoip.app** (free tier available)

---

## Testing

### Test Country Targeting Locally

1. **Create a Namibian Campaign:**
   - Target Countries: `NA`
   - Add a creative with text: "Welcome Namibia!"

2. **Create a Global Campaign:**
   - Leave all targeting empty
   - Add a creative with text: "Welcome Everyone!"

3. **Test in Radio App:**
   ```typescript
   // In App.tsx, try different countries:
   <AdBanner country="NA" />  // Should see Namibian ad
   <AdBanner country="US" />  // Should see global ad only
   <AdBanner country="ZA" />  // Should see global ad only
   ```

4. **Check Backend Logs:**
   - Look for: `"Selecting ad for user=... location=NA/..."`
   - Verify correct campaign is selected

---

## Database Migration

After deploying to production, run this command to add the country field:

```bash
# In Render.com shell or locally
alembic upgrade head
```

This will execute the `002_add_target_countries` migration.

---

## Benefits

✅ **Target by Nation** - Show ads only to specific countries  
✅ **Multi-Country Campaigns** - Target multiple countries at once  
✅ **Better ROI** - Advertisers can focus on their market  
✅ **Flexible** - Combine with city/state targeting  
✅ **Scalable** - Ready for international expansion  

---

## Example Use Cases

### 1. **Local Namibian Business**
```
Advertiser: "Sam's Auto Shop - Windhoek"
Target Countries: NA
Target Cities: Windhoek
→ Only shows to listeners in Windhoek, Namibia
```

### 2. **Regional Campaign**
```
Advertiser: "Southern Africa Travel Tours"
Target Countries: NA, ZA, BW, ZW
→ Shows to listeners in 4 countries
```

### 3. **Global Brand**
```
Advertiser: "Coca-Cola"
Target Countries: (empty)
→ Shows to all listeners worldwide
```

### 4. **Exclude Certain Countries** (Future Enhancement)
Currently, targeting is inclusive-only. To implement exclusion:
- Add `exclude_countries` field
- Update ad selection logic
- Example: Show to everyone EXCEPT US/EU

---

## Summary

Your ad manager now supports **country-level targeting**, making it perfect for:
- 🇳🇦 Namibian radio station serving local ads
- 🌍 Multi-national campaigns across Africa
- 🌐 Global campaigns reaching everyone
- 🎯 Precise geographic targeting (Country + City + State)

**The feature is complete and ready to deploy!** 🎉

---

## Next Steps

1. ✅ Deploy backend with database migration
2. ✅ Deploy admin panel with new country field
3. ✅ Deploy radio app with country detection
4. ✅ Create test campaigns with different targeting
5. ✅ Monitor performance and adjust as needed

**Happy targeting!** 🚀


