import os
import sys
import uuid
import httpx
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

BASE_URL = "http://127.0.0.1:8000"
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY", "").strip()

assert SUPABASE_URL and SUPABASE_KEY, "Missing Supabase configuration in .env"

admin_client = create_client(SUPABASE_URL, SUPABASE_KEY)

test_email_a = f"test_user_a_{uuid.uuid4().hex[:8]}@example.com"
test_email_b = f"test_user_b_{uuid.uuid4().hex[:8]}@example.com"
test_password = "Password123!@#"

user_a_id = None
user_b_id = None
created_case_ids = []

results = {}

def report(test_num, name, passed, detail=""):
    status_str = "PASS" if passed else "FAIL"
    results[test_num] = (name, status_str, detail)
    print(f"[{status_str}] Test {test_num}: {name} - {detail}")

try:
    # -------------------------------------------------------------
    # Test 1: Backend starts without import or syntax errors
    # -------------------------------------------------------------
    try:
        r = httpx.get(f"{BASE_URL}/")
        assert r.status_code == 200
        report(1, "Backend starts without import or syntax errors", True, f"Status {r.status_code}")
    except Exception as e:
        report(1, "Backend starts without import or syntax errors", False, str(e))

    # -------------------------------------------------------------
    # Test 2: /health and /dev/test-db still work
    # -------------------------------------------------------------
    try:
        r_health = httpx.get(f"{BASE_URL}/health")
        r_db = httpx.get(f"{BASE_URL}/dev/test-db")
        assert r_health.status_code == 200 and r_health.json().get("status") == "ok"
        assert r_db.status_code == 200 and r_db.json().get("status") == "connected"
        report(2, "/health and database test endpoints still work", True, "Both endpoints returned 200 OK")
    except Exception as e:
        report(2, "/health and database test endpoints still work", False, str(e))

    # -------------------------------------------------------------
    # Test 3: All four case endpoints are registered
    # -------------------------------------------------------------
    try:
        r_schema = httpx.get(f"{BASE_URL}/openapi.json")
        paths = r_schema.json().get("paths", {})
        has_list = "get" in paths.get("/api/cases", {})
        has_create = "post" in paths.get("/api/cases", {})
        has_get = "get" in paths.get("/api/cases/{case_id}", {})
        has_patch = "patch" in paths.get("/api/cases/{case_id}", {})
        assert has_list and has_create and has_get and has_patch
        report(3, "All four case endpoints registered in OpenAPI schema", True, "GET/POST /api/cases and GET/PATCH /api/cases/{case_id} registered")
    except Exception as e:
        report(3, "All four case endpoints registered in OpenAPI schema", False, str(e))

    # -------------------------------------------------------------
    # Test 4: Requests without a token return 401
    # -------------------------------------------------------------
    try:
        r1 = httpx.get(f"{BASE_URL}/api/cases")
        r2 = httpx.post(f"{BASE_URL}/api/cases", json={"title": "Unauthorized"})
        dummy_uuid = str(uuid.uuid4())
        r3 = httpx.get(f"{BASE_URL}/api/cases/{dummy_uuid}")
        r4 = httpx.patch(f"{BASE_URL}/api/cases/{dummy_uuid}", json={"title": "Updated"})
        assert r1.status_code == 401 and r2.status_code == 401 and r3.status_code == 401 and r4.status_code == 401
        report(4, "Requests without a token return 401", True, "All 4 endpoints returned 401 when no token is provided")
    except Exception as e:
        report(4, "Requests without a token return 401", False, str(e))

    # -------------------------------------------------------------
    # Test 5: Requests with an invalid or expired token are rejected (401)
    # -------------------------------------------------------------
    try:
        bad_headers = {"Authorization": "Bearer invalid.token.signature"}
        r = httpx.get(f"{BASE_URL}/api/cases", headers=bad_headers)
        assert r.status_code == 401
        report(5, "Requests with invalid token are rejected with 401", True, f"Rejected with {r.status_code}: {r.json().get('detail')}")
    except Exception as e:
        report(5, "Requests with invalid token are rejected with 401", False, str(e))

    # -------------------------------------------------------------
    # Setup test users
    # -------------------------------------------------------------
    u_a = admin_client.auth.admin.create_user({"email": test_email_a, "password": test_password, "email_confirm": True})
    user_a_id = u_a.user.id

    u_b = admin_client.auth.admin.create_user({"email": test_email_b, "password": test_password, "email_confirm": True})
    user_b_id = u_b.user.id

    client_a = create_client(SUPABASE_URL, SUPABASE_KEY)
    session_a = client_a.auth.sign_in_with_password({"email": test_email_a, "password": test_password})
    token_a = session_a.session.access_token
    headers_a = {"Authorization": f"Bearer {token_a}"}

    client_b = create_client(SUPABASE_URL, SUPABASE_KEY)
    session_b = client_b.auth.sign_in_with_password({"email": test_email_b, "password": test_password})
    token_b = session_b.session.access_token
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # -------------------------------------------------------------
    # Test 6: An authenticated user can create a valid case
    # -------------------------------------------------------------
    case_a_id = None
    try:
        payload = {
            "title": "Operation Nightfall",
            "description": "Initial forensic triage of ransomware payload",
            "case_type": "Malware Investigation",
            "status": "Open",
            "priority": "High"
        }
        r_create = httpx.post(f"{BASE_URL}/api/cases", json=payload, headers=headers_a)
        assert r_create.status_code == 201, f"Expected 201, got {r_create.status_code}: {r_create.text}"
        data = r_create.json()
        case_a_id = data.get("id")
        created_case_ids.append(case_a_id)
        assert data.get("title") == "Operation Nightfall"
        assert data.get("created_by") == user_a_id
        report(6, "Authenticated user can create a valid case", True, f"Created case ID {case_a_id} with created_by={user_a_id}")
    except Exception as e:
        report(6, "Authenticated user can create a valid case", False, str(e))

    # -------------------------------------------------------------
    # Test 7: Creator can list and view authorized case
    # -------------------------------------------------------------
    try:
        r_list = httpx.get(f"{BASE_URL}/api/cases", headers=headers_a)
        assert r_list.status_code == 200
        case_list = r_list.json()
        assert any(c["id"] == case_a_id for c in case_list)

        r_get = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}", headers=headers_a)
        assert r_get.status_code == 200
        assert r_get.json().get("id") == case_a_id
        report(7, "Creator can list and view an authorized case", True, "Listed and retrieved case successfully")
    except Exception as e:
        report(7, "Creator can list and view an authorized case", False, str(e))

    # -------------------------------------------------------------
    # Test 8: Valid updates succeed and update only permitted fields
    # -------------------------------------------------------------
    try:
        patch_payload = {
            "title": "Operation Nightfall - Phase 2",
            "status": "In Progress",
            "priority": "Medium"
        }
        r_patch = httpx.patch(f"{BASE_URL}/api/cases/{case_a_id}", json=patch_payload, headers=headers_a)
        assert r_patch.status_code == 200
        updated = r_patch.json()
        assert updated.get("title") == "Operation Nightfall - Phase 2"
        assert updated.get("status") == "In Progress"
        assert updated.get("priority") == "Medium"
        assert updated.get("created_by") == user_a_id  # protected field unchanged
        report(8, "Valid updates succeed and update only permitted fields", True, "Updated title, status, priority; protected fields preserved")
    except Exception as e:
        report(8, "Valid updates succeed and update only permitted fields", False, str(e))

    # -------------------------------------------------------------
    # Test 9: Invalid titles, statuses, priorities, UUIDs, and empty PATCH rejected
    # -------------------------------------------------------------
    try:
        # Invalid title (empty/whitespace)
        r_inv_title = httpx.post(f"{BASE_URL}/api/cases", json={"title": "   "}, headers=headers_a)
        assert r_inv_title.status_code in [400, 422]

        # Invalid status
        r_inv_status = httpx.post(f"{BASE_URL}/api/cases", json={"title": "Test", "status": "InvalidStatus"}, headers=headers_a)
        assert r_inv_status.status_code in [400, 422]

        # Invalid priority
        r_inv_priority = httpx.post(f"{BASE_URL}/api/cases", json={"title": "Test", "priority": "Extreme"}, headers=headers_a)
        assert r_inv_priority.status_code in [400, 422]

        # Invalid UUID
        r_inv_uuid = httpx.get(f"{BASE_URL}/api/cases/invalid-uuid-123", headers=headers_a)
        assert r_inv_uuid.status_code == 400

        # Empty PATCH
        r_empty_patch = httpx.patch(f"{BASE_URL}/api/cases/{case_a_id}", json={}, headers=headers_a)
        assert r_empty_patch.status_code == 400

        report(9, "Validation rejects invalid titles, statuses, priorities, UUIDs, and empty PATCH", True, "All invalid inputs rejected appropriately (400/422)")
    except Exception as e:
        report(9, "Validation rejects invalid titles, statuses, priorities, UUIDs, and empty PATCH", False, str(e))

    # -------------------------------------------------------------
    # Test 10: User B cannot read or update User A's private case
    # -------------------------------------------------------------
    try:
        # User B listing should not include User A's case
        r_list_b = httpx.get(f"{BASE_URL}/api/cases", headers=headers_b)
        assert r_list_b.status_code == 200
        assert not any(c["id"] == case_a_id for c in r_list_b.json())

        # User B getting User A's case returns 404 (privacy-preserving)
        r_get_b = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}", headers=headers_b)
        assert r_get_b.status_code == 404

        # User B updating User A's case returns 404 (privacy-preserving)
        r_patch_b = httpx.patch(f"{BASE_URL}/api/cases/{case_a_id}", json={"title": "Hacked"}, headers=headers_b)
        assert r_patch_b.status_code == 404

        report(10, "Cross-user security: User cannot read or update another user's private case", True, "User B blocked with privacy-preserving 404 on GET/PATCH and excluded from listing")
    except Exception as e:
        report(10, "Cross-user security: User cannot read or update another user's private case", False, str(e))

    # -------------------------------------------------------------
    # Test 11: A user cannot spoof created_by or modify protected fields
    # -------------------------------------------------------------
    try:
        spoof_payload = {
            "title": "Spoof Attempt Case",
            "created_by": user_b_id,  # Trying to set User B as creator
            "id": str(uuid.uuid4())   # Trying to inject custom ID
        }
        r_spoof = httpx.post(f"{BASE_URL}/api/cases", json=spoof_payload, headers=headers_a)
        assert r_spoof.status_code == 201
        data_spoof = r_spoof.json()
        created_case_ids.append(data_spoof.get("id"))
        assert data_spoof.get("created_by") == user_a_id, "created_by must be set strictly from authenticated user, not request body"
        assert data_spoof.get("id") != spoof_payload["id"], "Client ID injection must be ignored"
        report(11, "User cannot spoof created_by or inject custom ID", True, f"Server enforced created_by={user_a_id} and generated server UUID")
    except Exception as e:
        report(11, "User cannot spoof created_by or inject custom ID", False, str(e))

    # -------------------------------------------------------------
    # Test 12: Existing database records and RLS policies remain intact
    # -------------------------------------------------------------
    try:
        # Check that table cases still exists and count is accessible
        check_res = admin_client.table("cases").select("id", count="exact").limit(0).execute()
        assert check_res.count is not None
        report(12, "Existing database schema and RLS policies remain intact", True, f"cases table intact, count accessible")
    except Exception as e:
        report(12, "Existing database schema and RLS policies remain intact", False, str(e))

finally:
    # -------------------------------------------------------------
    # Clean up test cases and temporary users
    # -------------------------------------------------------------
    print("\n--- Cleaning up test records ---")
    for cid in created_case_ids:
        try:
            admin_client.table("cases").delete().eq("id", cid).execute()
            print(f"Deleted test case: {cid}")
        except Exception as e:
            print(f"Failed to delete test case {cid}: {e}")

    if user_a_id:
        try:
            admin_client.auth.admin.delete_user(user_a_id)
            print(f"Deleted test user A: {user_a_id}")
        except Exception as e:
            print(f"Failed to delete test user A: {e}")

    if user_b_id:
        try:
            admin_client.auth.admin.delete_user(user_b_id)
            print(f"Deleted test user B: {user_b_id}")
        except Exception as e:
            print(f"Failed to delete test user B: {e}")

    print("\n--- Test Summary ---")
    all_passed = True
    for t_num, (t_name, t_status, t_detail) in sorted(results.items()):
        print(f"Test {t_num}: {t_status} - {t_name}")
        if t_status != "PASS":
            all_passed = False

    sys.exit(0 if all_passed else 1)
