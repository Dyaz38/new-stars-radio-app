# QS-Prompt 2 Complete: Ad Selection & Tracking Services

✅ **Status**: Complete and Ready for Testing

## What Was Built

### 1. Ad Selection Service (`app/services/ad_selection.py`)

**Core Features:**
- ✅ Priority-based ad selection algorithm
- ✅ Geographic targeting (city/state matching)
- ✅ Budget management (respects impression budgets)
- ✅ Fair rotation (least recently served first)
- ✅ Active creative selection
- ✅ Atomic database updates
- ✅ Tracking token generation

**Algorithm Flow:**
1. Filter campaigns by status, date range, and budget
2. Apply geographic targeting if location provided
3. Sort by priority (highest first), then least recently served
4. Select active creative from chosen campaign
5. Generate impression and click tracking tokens
6. Update campaign metrics atomically
7. Return ad data with tracking URLs

**Performance:**
- Single database query for campaign selection
- SELECT FOR UPDATE for atomic impression counting
- Target: <100ms response time

### 2. Tracking Service (`app/services/tracking.py`)

**Core Features:**
- ✅ Impression tracking with validation
- ✅ Click tracking with redirect
- ✅ JWT token validation
- ✅ Replay attack prevention (used token tracking)
- ✅ Timestamp validation (5-minute window)
- ✅ User ID format validation
- ✅ Error handling and logging

**Impression Tracking:**
- Validates tracking token (JWT signature, expiry, ad/campaign match)
- Prevents replay attacks (token can only be used once)
- Validates timestamp is within 5 minutes
- Records location data (city, state)
- Creates impression record in database

**Click Tracking:**
- Same validation as impressions
- Records click in database
- Returns click_url for redirect
- Handles duplicate clicks gracefully (still redirects)

**Security:**
- Token replay prevention (in-memory set, use Redis in production)
- Timestamp validation
- User ID sanitization
- Error logging without exposing internals

### 3. Unit Tests

**Test Coverage:**
- ✅ Ad selection with no eligible campaigns
- ✅ Priority-based ordering
- ✅ Geographic targeting
- ✅ Tracking token generation
- ✅ Creative selection
- ✅ Campaign metric updates
- ✅ Impression tracking
- ✅ Click tracking
- ✅ Replay attack prevention
- ✅ Timestamp validation
- ✅ User ID validation

**Test Files:**
- `tests/unit/test_ad_selection_service.py` (11 tests)
- `tests/unit/test_tracking_service.py` (10 tests)

## File Structure

```
app/services/
├── ad_selection.py         # Ad selection algorithm
└── tracking.py             # Impression/click tracking

tests/unit/
├── test_ad_selection_service.py
└── test_tracking_service.py
```

## Key Classes and Methods

### AdSelectionService

```python
class AdSelectionService:
    def select_ad(user_id, placement, city, state) -> Dict[str, Any]
        # Main method: returns ad data with tracking tokens or None
    
    def _find_eligible_campaign(city, state) -> Campaign
        # Finds best campaign based on criteria
    
    def _select_creative(campaign) -> AdCreative
        # Chooses active creative from campaign
    
    def _update_campaign_served(campaign) -> None
        # Atomically updates impression count
```

### TrackingService

```python
class TrackingService:
    def track_impression(...) -> Dict[str, Any]
        # Records impression with validation
    
    def track_click(...) -> Dict[str, Any]
        # Records click and returns redirect URL
    
    def _validate_token(...)
        # Validates JWT tracking token
    
    def _validate_ad_and_campaign(...)
        # Checks ad/campaign exist and are active
```

## Testing the Services

### Running Unit Tests

```bash
# Run all tests
docker compose exec backend pytest tests/unit/ -v

# Run with coverage
docker compose exec backend pytest tests/unit/ --cov=app/services --cov-report=term

# Run specific test file
docker compose exec backend pytest tests/unit/test_ad_selection_service.py -v
```

### Manual Testing (After QS-Prompt 3)

Once API endpoints are created in QS-Prompt 3:

```bash
# Request an ad
curl -X POST http://localhost:8000/api/v1/ads/request \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-123",
    "placement": "banner_bottom",
    "location": {"city": "New York", "state": "NY"}
  }'

# Track impression (will need tracking token from ad request)
curl -X POST http://localhost:8000/api/v1/tracking/impression \
  -H "Content-Type: application/json" \
  -d '{
    "ad_id": "...",
    "campaign_id": "...",
    "user_id": "test-user-123",
    "tracking_token": "...",
    "timestamp": "2025-12-12T12:00:00Z"
  }'
```

## Performance Considerations

**Ad Selection:**
- ✅ Single query with proper indexes
- ✅ Eager loading of creatives (prevents N+1)
- ✅ Atomic updates using SQLAlchemy's update()
- ✅ Target: <100ms p95 response time

**Tracking:**
- ✅ Fast token validation (JWT decode)
- ✅ In-memory replay prevention (production: use Redis)
- ✅ Minimal database queries
- ✅ Non-blocking for impression tracking

## Security Features

1. **JWT Tokens**: Short-lived (5 min) with signature validation
2. **Replay Prevention**: Tokens can only be used once
3. **Timestamp Validation**: Rejects old/future timestamps
4. **Input Validation**: User IDs, UUIDs sanitized
5. **Error Handling**: No internal details leaked to clients

## Next Steps

**QS-Prompt 3**: API Endpoints (Ad Serving & Tracking)

Will create:
- `POST /api/v1/ads/request` - Request ad endpoint
- `POST /api/v1/tracking/impression` - Track impression
- `GET /api/v1/tracking/click/{token}` - Track click & redirect
- Rate limiting middleware
- Request/response schemas (Pydantic)
- Integration tests

**Ready to proceed with QS-Prompt 3!** 🚀

## Configuration

Services use settings from `app/core/config.py`:
- `AD_SELECTION_TIMEOUT`: 100ms (target response time)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: 60 (but tracking tokens use 5 min)
- `DEFAULT_AD_PRIORITY`: 5

## Troubleshooting

**No ads returned (None):**
- Check campaigns are 'active' status
- Verify current date is between start_date and end_date
- Ensure impression budget not exhausted
- Check geographic targeting matches (if specified)

**Tracking validation fails:**
- Verify tracking token not expired (5 min window)
- Check timestamp is recent
- Ensure ad_id and campaign_id match token
- Confirm ad and campaign are active

**Replay attack detected:**
- Each token can only be used once (this is correct behavior)
- Generate new tracking tokens for each ad request

## Production Enhancements (Post-MVP)

- ⏭️ Redis for token replay prevention (with TTL)
- ⏭️ Caching for eligible campaigns (5-minute TTL)
- ⏭️ Creative rotation based on performance (CTR)
- ⏭️ Frequency capping (limit impressions per user per day)
- ⏭️ Time-of-day targeting
- ⏭️ A/B testing between creatives
- ⏭️ Batch impression tracking (reduce DB load)

---

**Status**: ✅ QS-Prompt 2 Complete
**Next**: QS-Prompt 3 - API Endpoints






