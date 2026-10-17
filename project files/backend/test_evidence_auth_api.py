import hashlib
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

test_email_a = f"test_ev_user_a_{uuid.uuid4().hex[:8]}@example.com"
test_email_b = f"test_ev_user_b_{uuid.uuid4().hex[:8]}@example.com"
test_password = "Password123!@#"

user_a_id = None
user_b_id = None
created_case_ids = []
created_evidence_ids = []

results = {}

def report(test_num, name, passed, detail=""):
    status_str = "PASS" if passed else "FAIL"
    results[test_num] = (name, status_str, detail)
    print(f"[{status_str}] Test {test_num}: {name} - {detail}")

try:
    # -------------------------------------------------------------
    # Setup test users
    # -------------------------------------------------------------
    u_a = admin_client.auth.admin.create_user({"email": test_email_a, "password": test_password, "email_confirm": True})
    user_a_id = u_a.user.id

    u_b = admin_client.auth.admin.create_user({"email": test_email_b, "password": test_password, "email_confirm": True})
    user_b_id = u_b.user.id

    # -------------------------------------------------------------
    # Test 1: Valid credentials login
    # -------------------------------------------------------------
    token_a = None
    try:
        r_login = httpx.post(f"{BASE_URL}/api/auth/login", json={"email": test_email_a, "password": test_password})
        assert r_login.status_code == 200, f"Expected 200, got {r_login.status_code}"
        login_data = r_login.json()
        token_a = login_data.get("access_token")
        assert token_a and login_data.get("user", {}).get("id") == user_a_id
        report(1, "Valid credentials login via API returns access token and user identity", True, f"User {user_a_id} authenticated")
    except Exception as e:
        report(1, "Valid credentials login via API returns access token and user identity", False, str(e))

    # -------------------------------------------------------------
    # Test 2: Invalid credentials rejected
    # -------------------------------------------------------------
    try:
        r_bad = httpx.post(f"{BASE_URL}/api/auth/login", json={"email": test_email_a, "password": "WrongPassword123!"})
        assert r_bad.status_code == 401
        report(2, "Invalid credentials rejected with HTTP 401", True, f"Status {r_bad.status_code}: {r_bad.json().get('detail')}")
    except Exception as e:
        report(2, "Invalid credentials rejected with HTTP 401", False, str(e))

    # -------------------------------------------------------------
    # Test 3: Session verification /api/auth/me
    # -------------------------------------------------------------
    try:
        r_me = httpx.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token_a}"})
        assert r_me.status_code == 200 and r_me.json().get("user", {}).get("id") == user_a_id
        r_me_bad = httpx.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer bad.token"})
        assert r_me_bad.status_code == 401
        report(3, "Session verification /api/auth/me authenticates valid token and rejects bad token", True, "200 on valid token, 401 on invalid token")
    except Exception as e:
        report(3, "Session verification /api/auth/me authenticates valid token and rejects bad token", False, str(e))

    # Login user B
    r_login_b = httpx.post(f"{BASE_URL}/api/auth/login", json={"email": test_email_b, "password": test_password})
    token_b = r_login_b.json().get("access_token")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # -------------------------------------------------------------
    # Create test case for User A
    # -------------------------------------------------------------
    r_case = httpx.post(
        f"{BASE_URL}/api/cases",
        json={"title": "Evidence Test Case", "description": "Testing secure evidence uploads", "case_type": "Malware"},
        headers=headers_a,
    )
    assert r_case.status_code == 201
    case_a_id = r_case.json()["id"]
    created_case_ids.append(case_a_id)

    # -------------------------------------------------------------
    # Test 4: Upload valid evidence file with SHA-256 calculation
    # -------------------------------------------------------------
    test_content = b"Cyber forensics artifact log: suspicious IP 198.51.100.23 connected to port 4444"
    expected_hash = hashlib.sha256(test_content).hexdigest()
    evidence_id = None

    try:
        files = {"file": ("incident_log.txt", test_content, "text/plain")}
        data = {"description": "Suspicious network connection log"}
        r_upload = httpx.post(f"{BASE_URL}/api/cases/{case_a_id}/evidence", files=files, data=data, headers=headers_a)
        assert r_upload.status_code == 201, f"Expected 201, got {r_upload.status_code}: {r_upload.text}"
        ev_data = r_upload.json()
        evidence_id = ev_data.get("id")
        created_evidence_ids.append(evidence_id)
        assert ev_data.get("file_name") == "incident_log.txt"
        assert ev_data.get("sha256_hash") == expected_hash
        assert ev_data.get("file_size") == len(test_content)
        assert ev_data.get("uploaded_by") == user_a_id
        assert ev_data.get("storage_path", "").startswith(case_a_id)
        report(4, "Upload allowed test file, computes SHA-256, and stores in case folder", True, f"SHA-256 {expected_hash[:16]}... matches computed hash")
    except Exception as e:
        report(4, "Upload allowed test file, computes SHA-256, and stores in case folder", False, str(e))

    # -------------------------------------------------------------
    # Test 5: List evidence for case
    # -------------------------------------------------------------
    try:
        r_list = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}/evidence", headers=headers_a)
        assert r_list.status_code == 200
        ev_items = r_list.json()
        assert any(item["id"] == evidence_id for item in ev_items)
        report(5, "Authorized case creator can list case evidence", True, f"Retrieved {len(ev_items)} evidence item(s)")
    except Exception as e:
        report(5, "Authorized case creator can list case evidence", False, str(e))

    # -------------------------------------------------------------
    # Test 6: Secure download via temporary signed URL
    # -------------------------------------------------------------
    try:
        r_down = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}/evidence/{evidence_id}/download", headers=headers_a)
        assert r_down.status_code == 200
        signed_url = r_down.json().get("download_url")
        assert signed_url and "case-evidence" in signed_url
        # Fetch file from signed URL
        r_file = httpx.get(signed_url)
        assert r_file.status_code == 200
        assert r_file.content == test_content
        report(6, "Secure download via signed URL returns exact file content from private bucket", True, f"Retrieved {len(r_file.content)} bytes, matched original content")
    except Exception as e:
        report(6, "Secure download via signed URL returns exact file content from private bucket", False, str(e))

    # -------------------------------------------------------------
    # Test 7: Chain of custody logs track upload and download access
    # -------------------------------------------------------------
    try:
        r_custody = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}/evidence/{evidence_id}/custody", headers=headers_a)
        assert r_custody.status_code == 200
        custody_logs = r_custody.json()
        actions = [log["action"] for log in custody_logs]
        assert "EVIDENCE_UPLOADED" in actions
        assert "EVIDENCE_ACCESSED" in actions
        report(7, "Chain of custody table accurately logs upload and access events", True, f"Custody actions recorded: {actions}")
    except Exception as e:
        report(7, "Chain of custody table accurately logs upload and access events", False, str(e))

    # -------------------------------------------------------------
    # Test 8: Cross-user security: Unauthorized user cannot list or download
    # -------------------------------------------------------------
    try:
        r_unauth_list = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}/evidence", headers=headers_b)
        assert r_unauth_list.status_code == 404, f"Expected 404, got {r_unauth_list.status_code}"

        r_unauth_down = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}/evidence/{evidence_id}/download", headers=headers_b)
        assert r_unauth_down.status_code == 404, f"Expected 404, got {r_unauth_down.status_code}"

        r_unauth_upload = httpx.post(
            f"{BASE_URL}/api/cases/{case_a_id}/evidence",
            files={"file": ("hack.txt", b"malicious", "text/plain")},
            headers=headers_b,
        )
        assert r_unauth_upload.status_code == 404, f"Expected 404, got {r_unauth_upload.status_code}"

        report(8, "Cross-user security: Unauthorized user blocked from listing, downloading, or uploading evidence", True, "Privacy-preserving 404 enforced for unauthorized users")
    except Exception as e:
        report(8, "Cross-user security: Unauthorized user blocked from listing, downloading, or uploading evidence", False, str(e))

    # -------------------------------------------------------------
    # Test 9: Unsupported file types are rejected
    # -------------------------------------------------------------
    try:
        bad_files = {"file": ("malware.exe", b"MZ\x90\x00\x03", "application/x-msdownload")}
        r_bad_type = httpx.post(f"{BASE_URL}/api/cases/{case_a_id}/evidence", files=bad_files, headers=headers_a)
        assert r_bad_type.status_code == 400, f"Expected 400, got {r_bad_type.status_code}"
        assert "Unsupported file type" in r_bad_type.text
        report(9, "Unsupported file types rejected with HTTP 400", True, f"Rejected unsupported type: {r_bad_type.json().get('detail')}")
    except Exception as e:
        report(9, "Unsupported file types rejected with HTTP 400", False, str(e))

    # -------------------------------------------------------------
    # Test 10: Oversized files (>10MB) are rejected
    # -------------------------------------------------------------
    try:
        # Create virtual content > 10MB
        oversized = b"0" * (10 * 1024 * 1024 + 1024)
        big_files = {"file": ("large_dump.txt", oversized, "text/plain")}
        r_big = httpx.post(f"{BASE_URL}/api/cases/{case_a_id}/evidence", files=big_files, headers=headers_a)
        assert r_big.status_code == 400, f"Expected 400, got {r_big.status_code}"
        assert "exceeds maximum allowed size" in r_big.text
        report(10, "Oversized files (>10MB) rejected with HTTP 400", True, f"Rejected: {r_big.json().get('detail')}")
    except Exception as e:
        report(10, "Oversized files (>10MB) rejected with HTTP 400", False, str(e))

    # -------------------------------------------------------------
    # Test 11: Authorized evidence deletion and cleanup
    # -------------------------------------------------------------
    try:
        r_del = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}/evidence/{evidence_id}/download", headers=headers_a)
        r_delete = httpx.delete(f"{BASE_URL}/api/cases/{case_a_id}/evidence/{evidence_id}", headers=headers_a)
        assert r_delete.status_code == 200, f"Expected 200, got {r_delete.status_code}"

        # Verify no longer in list
        r_verify_list = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}/evidence", headers=headers_a)
        assert not any(item["id"] == evidence_id for item in r_verify_list.json())

        # Verify 404 on download
        r_verify_down = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}/evidence/{evidence_id}/download", headers=headers_a)
        assert r_verify_down.status_code == 404

        report(11, "Authorized evidence deletion cleans up storage object and metadata", True, "Deleted cleanly, subsequent requests return 404")
    except Exception as e:
        report(11, "Authorized evidence deletion cleans up storage object and metadata", False, str(e))

finally:
    print("\n--- Cleaning up test records ---")
    # Clean up evidence
    for eid in created_evidence_ids:
        try:
            admin_client.table("chain_of_custody").delete().eq("evidence_id", eid).execute()
            admin_client.table("evidence").delete().eq("id", eid).execute()
        except Exception:
            pass

    # Clean up cases
    for cid in created_case_ids:
        try:
            admin_client.table("cases").delete().eq("id", cid).execute()
            print(f"Deleted test case: {cid}")
        except Exception as e:
            print(f"Error deleting case {cid}: {e}")

    # Clean up test users
    if user_a_id:
        try:
            admin_client.auth.admin.delete_user(user_a_id)
            print(f"Deleted test user A: {user_a_id}")
        except Exception as e:
            print(f"Error deleting user A: {e}")

    if user_b_id:
        try:
            admin_client.auth.admin.delete_user(user_b_id)
            print(f"Deleted test user B: {user_b_id}")
        except Exception as e:
            print(f"Error deleting user B: {e}")

print("\n--- Evidence & Auth Test Summary ---")
all_passed = True
for num, (name, status_str, detail) in sorted(results.items()):
    print(f"Test {num}: {status_str} - {name}")
    if status_str != "PASS":
        all_passed = False

if not all_passed:
    sys.exit(1)
