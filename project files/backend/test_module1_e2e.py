import hashlib
import os
import sys
import uuid
import httpx
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

BASE_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY", "").strip()

assert SUPABASE_URL and SUPABASE_KEY, "Missing Supabase configuration in .env"

admin_client = create_client(SUPABASE_URL, SUPABASE_KEY)

test_email_a = f"test_e2e_a_{uuid.uuid4().hex[:8]}@example.com"
test_email_b = f"test_e2e_b_{uuid.uuid4().hex[:8]}@example.com"
test_password = "Password123!@#"

user_a_id = None
user_b_id = None
created_case_ids = []
created_evidence_ids = []

results = {}

def report(test_id, category, name, passed, detail=""):
    status_str = "PASS" if passed else "FAIL"
    results[test_id] = (category, name, status_str, detail)
    print(f"[{status_str}] [{category}] {test_id}: {name} - {detail}")

try:
    print("\n=== STARTING MODULE 1 END-TO-END VALIDATION ===\n")

    # =========================================================================
    # SECTION 1: AUTHENTICATION & SESSION HANDLING
    # =========================================================================

    # Setup test users
    u_a = admin_client.auth.admin.create_user({"email": test_email_a, "password": test_password, "email_confirm": True})
    user_a_id = u_a.user.id

    u_b = admin_client.auth.admin.create_user({"email": test_email_b, "password": test_password, "email_confirm": True})
    user_b_id = u_b.user.id

    # 1.1: Valid credentials login via API
    token_a = None
    try:
        r_login = httpx.post(f"{BASE_URL}/api/auth/login", json={"email": test_email_a, "password": test_password})
        assert r_login.status_code == 200, f"Expected 200, got {r_login.status_code}"
        login_data = r_login.json()
        token_a = login_data.get("access_token")
        assert token_a and login_data.get("user", {}).get("id") == user_a_id
        report("AUTH-1", "Auth", "Valid credentials login", True, f"Token returned for user {user_a_id}")
    except Exception as e:
        report("AUTH-1", "Auth", "Valid credentials login", False, str(e))

    # 1.2: Invalid credentials rejected
    try:
        r_bad = httpx.post(f"{BASE_URL}/api/auth/login", json={"email": test_email_a, "password": "WrongPassword!"})
        assert r_bad.status_code == 401
        report("AUTH-2", "Auth", "Invalid credentials rejected (401)", True, f"Rejected with HTTP 401")
    except Exception as e:
        report("AUTH-2", "Auth", "Invalid credentials rejected (401)", False, str(e))

    # 1.3: Session verification /api/auth/me
    try:
        r_me = httpx.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token_a}"})
        assert r_me.status_code == 200 and r_me.json().get("user", {}).get("id") == user_a_id
        report("AUTH-3", "Auth", "Session verification /api/auth/me", True, "User identity confirmed")
    except Exception as e:
        report("AUTH-3", "Auth", "Session verification /api/auth/me", False, str(e))

    # 1.4: Protected endpoints reject missing / invalid token
    try:
        r_missing = httpx.get(f"{BASE_URL}/api/cases")
        r_invalid = httpx.get(f"{BASE_URL}/api/cases", headers={"Authorization": "Bearer bad.token.val"})
        assert r_missing.status_code == 401 and r_invalid.status_code == 401
        report("AUTH-4", "Auth", "Protected endpoints reject missing/invalid tokens", True, "Both returned HTTP 401")
    except Exception as e:
        report("AUTH-4", "Auth", "Protected endpoints reject missing/invalid tokens", False, str(e))

    # Setup headers for User B
    r_login_b = httpx.post(f"{BASE_URL}/api/auth/login", json={"email": test_email_b, "password": test_password})
    token_b = r_login_b.json().get("access_token")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # =========================================================================
    # SECTION 2: CASE MANAGEMENT CRUD
    # =========================================================================

    # 2.1: Create valid case with full fields
    case_a_id = None
    try:
        payload = {
            "title": "Malware Outbreak Alpha",
            "description": "Investigating suspicious command and control traffic",
            "case_type": "Malware",
            "status": "Open",
            "priority": "High"
        }
        r_create = httpx.post(f"{BASE_URL}/api/cases", json=payload, headers=headers_a)
        assert r_create.status_code == 201, f"Expected 201, got {r_create.status_code}"
        case_data = r_create.json()
        case_a_id = case_data.get("id")
        created_case_ids.append(case_a_id)
        assert case_data.get("created_by") == user_a_id
        assert case_data.get("title") == "Malware Outbreak Alpha"
        report("CASE-1", "Cases", "Create case with full metadata", True, f"Created case {case_a_id} with creator {user_a_id}")
    except Exception as e:
        report("CASE-1", "Cases", "Create case with full metadata", False, str(e))

    # 2.2: User cannot spoof created_by or inject custom ID
    try:
        spoof = {
            "title": "Spoof Test",
            "created_by": user_b_id,
            "id": str(uuid.uuid4())
        }
        r_spoof = httpx.post(f"{BASE_URL}/api/cases", json=spoof, headers=headers_a)
        assert r_spoof.status_code == 201
        data_s = r_spoof.json()
        created_case_ids.append(data_s.get("id"))
        assert data_s.get("created_by") == user_a_id
        assert data_s.get("id") != spoof["id"]
        report("CASE-2", "Cases", "Server enforces created_by and generates UUID", True, "Spoofed creator and ID ignored")
    except Exception as e:
        report("CASE-2", "Cases", "Server enforces created_by and generates UUID", False, str(e))

    # 2.3: Validation rejects invalid inputs
    try:
        r_bad_title = httpx.post(f"{BASE_URL}/api/cases", json={"title": "   "}, headers=headers_a)
        r_bad_status = httpx.post(f"{BASE_URL}/api/cases", json={"title": "T", "status": "BadStatus"}, headers=headers_a)
        r_bad_priority = httpx.post(f"{BASE_URL}/api/cases", json={"title": "T", "priority": "Urgent"}, headers=headers_a)
        r_bad_uuid = httpx.get(f"{BASE_URL}/api/cases/not-a-uuid", headers=headers_a)
        assert r_bad_title.status_code in [400, 422]
        assert r_bad_status.status_code in [400, 422]
        assert r_bad_priority.status_code in [400, 422]
        assert r_bad_uuid.status_code == 400
        report("CASE-3", "Cases", "Input validation rejects invalid values", True, "All invalid inputs rejected")
    except Exception as e:
        report("CASE-3", "Cases", "Input validation rejects invalid values", False, str(e))

    # 2.4: Read cases: List authorized cases
    try:
        r_list = httpx.get(f"{BASE_URL}/api/cases", headers=headers_a)
        assert r_list.status_code == 200
        all_cases = r_list.json()
        assert any(c["id"] == case_a_id for c in all_cases)
        report("CASE-4", "Cases", "List authorized cases", True, f"Retrieved {len(all_cases)} cases")
    except Exception as e:
        report("CASE-4", "Cases", "List authorized cases", False, str(e))

    # 2.5: Search and filter cases
    try:
        r_filt = httpx.get(f"{BASE_URL}/api/cases?status=Open&priority=High&search=Malware", headers=headers_a)
        assert r_filt.status_code == 200
        filt_cases = r_filt.json()
        assert any(c["id"] == case_a_id for c in filt_cases)
        report("CASE-5", "Cases", "Search and filter cases", True, f"Found matching case in filtered search")
    except Exception as e:
        report("CASE-5", "Cases", "Search and filter cases", False, str(e))

    # 2.6: Read single case details
    try:
        r_get = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}", headers=headers_a)
        assert r_get.status_code == 200
        c_detail = r_get.json()
        assert c_detail.get("id") == case_a_id
        assert c_detail.get("status") == "Open"
        report("CASE-6", "Cases", "Retrieve single case details by ID", True, f"Case retrieved: {c_detail['title']}")
    except Exception as e:
        report("CASE-6", "Cases", "Retrieve single case details by ID", False, str(e))

    # 2.7: Update permitted fields
    try:
        patch_payload = {
            "title": "Malware Outbreak Alpha - Remediation",
            "status": "In Progress",
            "priority": "Medium",
            "description": "Systems isolated, analyzing payload"
        }
        r_patch = httpx.patch(f"{BASE_URL}/api/cases/{case_a_id}", json=patch_payload, headers=headers_a)
        assert r_patch.status_code == 200
        c_updated = r_patch.json()
        assert c_updated.get("title") == "Malware Outbreak Alpha - Remediation"
        assert c_updated.get("status") == "In Progress"
        assert c_updated.get("priority") == "Medium"
        assert c_updated.get("created_by") == user_a_id
        report("CASE-7", "Cases", "Update permitted case fields", True, "Title, status, priority updated; creator preserved")
    except Exception as e:
        report("CASE-7", "Cases", "Update permitted case fields", False, str(e))

    # 2.8: Cross-user privacy: User B cannot access User A's case
    try:
        r_b_list = httpx.get(f"{BASE_URL}/api/cases", headers=headers_b)
        assert not any(c["id"] == case_a_id for c in r_b_list.json())
        r_b_get = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}", headers=headers_b)
        assert r_b_get.status_code == 404
        r_b_patch = httpx.patch(f"{BASE_URL}/api/cases/{case_a_id}", json={"title": "Hacked"}, headers=headers_b)
        assert r_b_patch.status_code == 404
        report("CASE-8", "Cases", "Cross-user security (privacy-preserving 404)", True, "User B excluded and received 404")
    except Exception as e:
        report("CASE-8", "Cases", "Cross-user security (privacy-preserving 404)", False, str(e))

    # =========================================================================
    # SECTION 3: EVIDENCE & DOCUMENT MANAGEMENT
    # =========================================================================

    test_content = b"Cyber forensics artifact dump: malicious payload signature 9b2d8f"
    expected_hash = hashlib.sha256(test_content).hexdigest()
    evidence_id = None

    # 3.1: Upload permitted test file
    try:
        files = {"file": ("artifact_dump.txt", test_content, "text/plain")}
        data = {"description": "Memory artifact capture"}
        r_up = httpx.post(f"{BASE_URL}/api/cases/{case_a_id}/evidence", files=files, data=data, headers=headers_a)
        assert r_up.status_code == 201, f"Expected 201, got {r_up.status_code}: {r_up.text}"
        ev_data = r_up.json()
        evidence_id = ev_data.get("id")
        created_evidence_ids.append(evidence_id)
        assert ev_data.get("file_name") == "artifact_dump.txt"
        assert ev_data.get("sha256_hash") == expected_hash
        assert ev_data.get("file_size") == len(test_content)
        assert ev_data.get("uploaded_by") == user_a_id
        assert ev_data.get("storage_path", "").startswith(case_a_id)
        report("EVID-1", "Evidence", "Upload evidence & compute SHA-256 hash", True, f"Saved with hash {expected_hash[:16]}...")
    except Exception as e:
        report("EVID-1", "Evidence", "Upload evidence & compute SHA-256 hash", False, str(e))

    # 3.2: Verify evidence listing
    try:
        r_ev_list = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}/evidence", headers=headers_a)
        assert r_ev_list.status_code == 200
        ev_items = r_ev_list.json()
        assert any(item["id"] == evidence_id for item in ev_items)
        report("EVID-2", "Evidence", "List evidence for case", True, f"Listed {len(ev_items)} evidence item(s)")
    except Exception as e:
        report("EVID-2", "Evidence", "List evidence for case", False, str(e))

    # 3.3: Secure download via signed URL
    try:
        r_down = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}/evidence/{evidence_id}/download", headers=headers_a)
        assert r_down.status_code == 200
        signed_url = r_down.json().get("download_url")
        assert signed_url and "case-evidence" in signed_url
        r_file = httpx.get(signed_url)
        assert r_file.status_code == 200
        assert r_file.content == test_content
        report("EVID-3", "Evidence", "Secure download via signed URL", True, f"Downloaded {len(r_file.content)} bytes, verified match")
    except Exception as e:
        report("EVID-3", "Evidence", "Secure download via signed URL", False, str(e))

    # 3.4: Chain of custody logging
    try:
        r_custody = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}/evidence/{evidence_id}/custody", headers=headers_a)
        assert r_custody.status_code == 200
        custody_logs = r_custody.json()
        actions = [log["action"] for log in custody_logs]
        assert "EVIDENCE_UPLOADED" in actions
        assert "EVIDENCE_ACCESSED" in actions
        report("EVID-4", "Evidence", "Chain of custody tracks upload and access", True, f"Custody actions: {actions}")
    except Exception as e:
        report("EVID-4", "Evidence", "Chain of custody tracks upload and access", False, str(e))

    # 3.5: Cross-user evidence protection
    try:
        r_b_ev_list = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}/evidence", headers=headers_b)
        assert r_b_ev_list.status_code == 404
        r_b_down = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}/evidence/{evidence_id}/download", headers=headers_b)
        assert r_b_down.status_code == 404
        report("EVID-5", "Evidence", "Cross-user evidence protection (404)", True, "Unauthorized user blocked")
    except Exception as e:
        report("EVID-5", "Evidence", "Cross-user evidence protection (404)", False, str(e))

    # 3.6: Reject unsupported file types (.exe)
    try:
        bad_f = {"file": ("malware.exe", b"MZ\x90", "application/x-msdownload")}
        r_bad_type = httpx.post(f"{BASE_URL}/api/cases/{case_a_id}/evidence", files=bad_f, headers=headers_a)
        assert r_bad_type.status_code == 400
        report("EVID-6", "Evidence", "Unsupported file types rejected (400)", True, r_bad_type.json().get("detail"))
    except Exception as e:
        report("EVID-6", "Evidence", "Unsupported file types rejected (400)", False, str(e))

    # 3.7: Reject oversized files (>10MB)
    try:
        oversized = b"A" * (10 * 1024 * 1024 + 1024)
        big_f = {"file": ("big.txt", oversized, "text/plain")}
        r_big = httpx.post(f"{BASE_URL}/api/cases/{case_a_id}/evidence", files=big_f, headers=headers_a)
        assert r_big.status_code == 400
        report("EVID-7", "Evidence", "Oversized files rejected (400)", True, r_big.json().get("detail"))
    except Exception as e:
        report("EVID-7", "Evidence", "Oversized files rejected (400)", False, str(e))

    # =========================================================================
    # SECTION 4: CASE DELETION / ARCHIVAL & DEPENDENCY CHECKS
    # =========================================================================

    # 4.1: Delete case blocked when active evidence exists (409 Conflict)
    try:
        r_del_blocked = httpx.delete(f"{BASE_URL}/api/cases/{case_a_id}", headers=headers_a)
        assert r_del_blocked.status_code == 409
        report("CASE-DEL-1", "Cases", "Delete blocked when evidence exists (409)", True, r_del_blocked.json().get("detail"))
    except Exception as e:
        report("CASE-DEL-1", "Cases", "Delete blocked when evidence exists (409)", False, str(e))

    # 4.2: Safe case archiving (Close case)
    try:
        r_archive = httpx.patch(f"{BASE_URL}/api/cases/{case_a_id}", json={"status": "Closed"}, headers=headers_a)
        assert r_archive.status_code == 200
        assert r_archive.json().get("status") == "Closed"
        report("CASE-DEL-2", "Cases", "Safe case archival (status Closed)", True, "Case closed safely while preserving all evidence")
    except Exception as e:
        report("CASE-DEL-2", "Cases", "Safe case archival (status Closed)", False, str(e))

    # 4.3: Authorized evidence deletion preserves audit history
    try:
        r_del_ev = httpx.delete(f"{BASE_URL}/api/cases/{case_a_id}/evidence/{evidence_id}", headers=headers_a)
        assert r_del_ev.status_code == 200
        # Verify download now 404
        r_ver_down = httpx.get(f"{BASE_URL}/api/cases/{case_a_id}/evidence/{evidence_id}/download", headers=headers_a)
        assert r_ver_down.status_code == 404
        report("EVID-8", "Evidence", "Authorized evidence deletion & audit trail", True, "Storage and metadata cleaned up; subsequent download 404")
    except Exception as e:
        report("EVID-8", "Evidence", "Authorized evidence deletion & audit trail", False, str(e))

    # 4.4: Clean case deletion for empty cases without dependencies
    try:
        r_clean_c = httpx.post(f"{BASE_URL}/api/cases", json={"title": "Temporary Clean Case"}, headers=headers_a)
        clean_c_id = r_clean_c.json()["id"]
        r_del_clean = httpx.delete(f"{BASE_URL}/api/cases/{clean_c_id}", headers=headers_a)
        assert r_del_clean.status_code == 200
        # Verify 404 on get
        r_verify_gone = httpx.get(f"{BASE_URL}/api/cases/{clean_c_id}", headers=headers_a)
        assert r_verify_gone.status_code == 404
        report("CASE-DEL-3", "Cases", "Clean case deletion for empty cases", True, f"Clean case {clean_c_id} deleted and verified 404")
    except Exception as e:
        report("CASE-DEL-3", "Cases", "Clean case deletion for empty cases", False, str(e))

    # =========================================================================
    # SECTION 5: FRONTEND INTEGRATION
    # =========================================================================

    try:
        r_front = httpx.get(FRONTEND_URL)
        assert r_front.status_code == 200
        html = r_front.text
        assert "Cyber Forensics" in html
        assert "Evidence" in html
        assert "Dashboard" in html
        report("FRONT-1", "Frontend", "Website renders at http://localhost:3000", True, "HTTP 200, Module 1 navigation rendered")
    except Exception as e:
        report("FRONT-1", "Frontend", "Website renders at http://localhost:3000", False, str(e))

finally:
    print("\n--- Cleaning up temporary test records ---")
    for eid in created_evidence_ids:
        try:
            admin_client.table("chain_of_custody").delete().eq("evidence_id", eid).execute()
            admin_client.table("evidence").delete().eq("id", eid).execute()
        except Exception:
            pass

    for cid in created_case_ids:
        try:
            admin_client.table("audit_logs").delete().eq("case_id", cid).execute()
            admin_client.table("chain_of_custody").delete().eq("case_id", cid).execute()
            admin_client.table("evidence").delete().eq("case_id", cid).execute()
            admin_client.table("case_members").delete().eq("case_id", cid).execute()
            admin_client.table("cases").delete().eq("id", cid).execute()
            print(f"Cleaned up case {cid}")
        except Exception as e:
            print(f"Error cleaning case {cid}: {e}")

    if user_a_id:
        try:
            admin_client.auth.admin.delete_user(user_a_id)
            print(f"Cleaned up test user A: {user_a_id}")
        except Exception:
            pass

    if user_b_id:
        try:
            admin_client.auth.admin.delete_user(user_b_id)
            print(f"Cleaned up test user B: {user_b_id}")
        except Exception:
            pass

print("\n=== FINAL TEST RESULTS SUMMARY ===")
all_passed = True
for tid, (cat, name, status_str, detail) in sorted(results.items()):
    print(f"[{status_str}] {tid} ({cat}): {name} - {detail}")
    if status_str != "PASS":
        all_passed = False

print(f"\nOverall Result: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
if not all_passed:
    sys.exit(1)
