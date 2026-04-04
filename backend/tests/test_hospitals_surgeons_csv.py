"""Backend API Tests for Hospitals, Surgeons CRUD and CSV Export Filtering

Tests cover:
- GET /api/hospitals - List all hospitals
- POST /api/hospitals - Create new hospital
- DELETE /api/hospitals/{id} - Delete hospital
- GET /api/surgeons - List all surgeons
- POST /api/surgeons - Create new surgeon
- DELETE /api/surgeons/{id} - Delete surgeon
- GET /api/cases/export/csv with period filtering (quarterly, yearly, all)
"""

import pytest
import requests


class TestHospitalsCRUD:
    """Hospital CRUD operation tests"""

    def test_get_hospitals(self, api_client, base_url):
        """Test GET /api/hospitals returns list of hospitals"""
        try:
            response = api_client.get(f"{base_url}/api/hospitals")
            print(f"✓ GET /api/hospitals status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Retrieved {len(data)} hospitals")

            # Verify structure if hospitals exist
            if len(data) > 0:
                assert "id" in data[0]
                assert "name" in data[0]
                assert "_id" not in data[0]
                print(f"✓ Hospital structure correct, MongoDB _id excluded")
        except Exception as e:
            print(f"✗ GET hospitals test failed: {str(e)}")
            raise

    def test_create_hospital(self, api_client, base_url):
        """Test POST /api/hospitals creates new hospital"""
        try:
            payload = {"name": "TEST_New Hospital"}
            response = api_client.post(f"{base_url}/api/hospitals", json=payload)
            print(f"✓ POST /api/hospitals status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert "id" in data
            assert "name" in data
            assert data["name"] == "TEST_New Hospital"
            print(f"✓ Hospital created with ID: {data['id']}")

            # Verify persistence with GET
            get_response = api_client.get(f"{base_url}/api/hospitals")
            assert get_response.status_code == 200
            hospitals = get_response.json()
            hospital_names = [h["name"] for h in hospitals]
            assert "TEST_New Hospital" in hospital_names
            print(f"✓ Hospital persisted correctly in database")

            # Cleanup
            api_client.delete(f"{base_url}/api/hospitals/{data['id']}")
        except Exception as e:
            print(f"✗ Create hospital test failed: {str(e)}")
            raise

    def test_create_hospital_with_whitespace(self, api_client, base_url):
        """Test POST /api/hospitals trims whitespace from name"""
        try:
            payload = {"name": "  TEST_Whitespace Hospital  "}
            response = api_client.post(f"{base_url}/api/hospitals", json=payload)
            assert response.status_code == 200

            data = response.json()
            assert data["name"] == "TEST_Whitespace Hospital"
            print(f"✓ Hospital name whitespace trimmed correctly")

            # Cleanup
            api_client.delete(f"{base_url}/api/hospitals/{data['id']}")
        except Exception as e:
            print(f"✗ Whitespace trim test failed: {str(e)}")
            raise

    def test_delete_hospital(self, api_client, base_url):
        """Test DELETE /api/hospitals/{id} deletes hospital"""
        try:
            # Create test hospital
            payload = {"name": "TEST_Delete Hospital"}
            create_response = api_client.post(f"{base_url}/api/hospitals", json=payload)
            assert create_response.status_code == 200
            hospital_id = create_response.json()["id"]

            # Delete hospital
            delete_response = api_client.delete(f"{base_url}/api/hospitals/{hospital_id}")
            print(f"✓ DELETE /api/hospitals/{hospital_id} status: {delete_response.status_code}")
            assert delete_response.status_code == 200

            delete_data = delete_response.json()
            assert "message" in delete_data
            print(f"✓ Hospital deleted successfully")

            # Verify deletion
            get_response = api_client.get(f"{base_url}/api/hospitals")
            hospitals = get_response.json()
            hospital_ids = [h["id"] for h in hospitals]
            assert hospital_id not in hospital_ids
            print(f"✓ Hospital no longer in list after deletion")
        except Exception as e:
            print(f"✗ Delete hospital test failed: {str(e)}")
            raise

    def test_delete_nonexistent_hospital(self, api_client, base_url):
        """Test DELETE /api/hospitals/{id} returns 404 for nonexistent hospital"""
        try:
            fake_id = "nonexistent-hospital-id-99999"
            response = api_client.delete(f"{base_url}/api/hospitals/{fake_id}")
            print(f"✓ Delete nonexistent hospital status: {response.status_code}")
            assert response.status_code == 404

            data = response.json()
            assert "detail" in data
            print(f"✓ 404 error returned for nonexistent hospital")
        except Exception as e:
            print(f"✗ Delete nonexistent hospital test failed: {str(e)}")
            raise


class TestSurgeonsCRUD:
    """Surgeon CRUD operation tests"""

    def test_get_surgeons(self, api_client, base_url):
        """Test GET /api/surgeons returns list of surgeons"""
        try:
            response = api_client.get(f"{base_url}/api/surgeons")
            print(f"✓ GET /api/surgeons status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Retrieved {len(data)} surgeons")

            # Verify structure if surgeons exist
            if len(data) > 0:
                assert "id" in data[0]
                assert "name" in data[0]
                assert "_id" not in data[0]
                print(f"✓ Surgeon structure correct, MongoDB _id excluded")
        except Exception as e:
            print(f"✗ GET surgeons test failed: {str(e)}")
            raise

    def test_create_surgeon(self, api_client, base_url):
        """Test POST /api/surgeons creates new surgeon"""
        try:
            payload = {"name": "TEST_Dr. New Surgeon"}
            response = api_client.post(f"{base_url}/api/surgeons", json=payload)
            print(f"✓ POST /api/surgeons status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert "id" in data
            assert "name" in data
            assert data["name"] == "TEST_Dr. New Surgeon"
            print(f"✓ Surgeon created with ID: {data['id']}")

            # Verify persistence with GET
            get_response = api_client.get(f"{base_url}/api/surgeons")
            assert get_response.status_code == 200
            surgeons = get_response.json()
            surgeon_names = [s["name"] for s in surgeons]
            assert "TEST_Dr. New Surgeon" in surgeon_names
            print(f"✓ Surgeon persisted correctly in database")

            # Cleanup
            api_client.delete(f"{base_url}/api/surgeons/{data['id']}")
        except Exception as e:
            print(f"✗ Create surgeon test failed: {str(e)}")
            raise

    def test_create_surgeon_with_whitespace(self, api_client, base_url):
        """Test POST /api/surgeons trims whitespace from name"""
        try:
            payload = {"name": "  TEST_Dr. Whitespace  "}
            response = api_client.post(f"{base_url}/api/surgeons", json=payload)
            assert response.status_code == 200

            data = response.json()
            assert data["name"] == "TEST_Dr. Whitespace"
            print(f"✓ Surgeon name whitespace trimmed correctly")

            # Cleanup
            api_client.delete(f"{base_url}/api/surgeons/{data['id']}")
        except Exception as e:
            print(f"✗ Whitespace trim test failed: {str(e)}")
            raise

    def test_delete_surgeon(self, api_client, base_url):
        """Test DELETE /api/surgeons/{id} deletes surgeon"""
        try:
            # Create test surgeon
            payload = {"name": "TEST_Dr. Delete"}
            create_response = api_client.post(f"{base_url}/api/surgeons", json=payload)
            assert create_response.status_code == 200
            surgeon_id = create_response.json()["id"]

            # Delete surgeon
            delete_response = api_client.delete(f"{base_url}/api/surgeons/{surgeon_id}")
            print(f"✓ DELETE /api/surgeons/{surgeon_id} status: {delete_response.status_code}")
            assert delete_response.status_code == 200

            delete_data = delete_response.json()
            assert "message" in delete_data
            print(f"✓ Surgeon deleted successfully")

            # Verify deletion
            get_response = api_client.get(f"{base_url}/api/surgeons")
            surgeons = get_response.json()
            surgeon_ids = [s["id"] for s in surgeons]
            assert surgeon_id not in surgeon_ids
            print(f"✓ Surgeon no longer in list after deletion")
        except Exception as e:
            print(f"✗ Delete surgeon test failed: {str(e)}")
            raise

    def test_delete_nonexistent_surgeon(self, api_client, base_url):
        """Test DELETE /api/surgeons/{id} returns 404 for nonexistent surgeon"""
        try:
            fake_id = "nonexistent-surgeon-id-99999"
            response = api_client.delete(f"{base_url}/api/surgeons/{fake_id}")
            print(f"✓ Delete nonexistent surgeon status: {response.status_code}")
            assert response.status_code == 404

            data = response.json()
            assert "detail" in data
            print(f"✓ 404 error returned for nonexistent surgeon")
        except Exception as e:
            print(f"✗ Delete nonexistent surgeon test failed: {str(e)}")
            raise


class TestCSVExportFiltering:
    """CSV export with period filtering tests"""

    def test_csv_export_quarterly_q1(self, api_client, base_url):
        """Test CSV export with quarterly filtering for Q1 2026"""
        try:
            # Create test cases for Q1 2026 (Jan, Feb, Mar)
            test_cases = [
                {"patient_name": "TEST_Q1_Jan", "surgery_name": "TEST_Surgery", "date": "15/01/2026", "anaesthesia_fees": 1000},
                {"patient_name": "TEST_Q1_Feb", "surgery_name": "TEST_Surgery", "date": "15/02/2026", "anaesthesia_fees": 2000},
                {"patient_name": "TEST_Q1_Mar", "surgery_name": "TEST_Surgery", "date": "15/03/2026", "anaesthesia_fees": 3000},
                {"patient_name": "TEST_Q2_Apr", "surgery_name": "TEST_Surgery", "date": "15/04/2026", "anaesthesia_fees": 4000},
            ]
            
            created_ids = []
            for case in test_cases:
                resp = api_client.post(f"{base_url}/api/cases", json=case)
                if resp.status_code == 200:
                    created_ids.append(resp.json()["id"])

            # Export Q1 2026 CSV
            response = api_client.get(f"{base_url}/api/cases/export/csv?period=quarterly&year=2026&quarter=1")
            print(f"✓ CSV export Q1 2026 status: {response.status_code}")
            assert response.status_code == 200

            # Check content type
            assert "text/csv" in response.headers.get("content-type", "")
            print(f"✓ CSV content-type correct")

            # Check filename
            assert "cases_Q1_2026.csv" in response.headers.get("content-disposition", "")
            print(f"✓ CSV filename correct: cases_Q1_2026.csv")

            # Check CSV content
            csv_text = response.text
            assert "TEST_Q1_Jan" in csv_text
            assert "TEST_Q1_Feb" in csv_text
            assert "TEST_Q1_Mar" in csv_text
            assert "TEST_Q2_Apr" not in csv_text
            print(f"✓ CSV contains only Q1 2026 cases (Jan, Feb, Mar)")

            # Cleanup
            for case_id in created_ids:
                api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ CSV quarterly Q1 test failed: {str(e)}")
            raise

    def test_csv_export_quarterly_q2(self, api_client, base_url):
        """Test CSV export with quarterly filtering for Q2 2026"""
        try:
            # Create test cases for Q2 2026 (Apr, May, Jun)
            test_cases = [
                {"patient_name": "TEST_Q2_Apr", "surgery_name": "TEST_Surgery", "date": "15/04/2026", "anaesthesia_fees": 1000},
                {"patient_name": "TEST_Q2_May", "surgery_name": "TEST_Surgery", "date": "15/05/2026", "anaesthesia_fees": 2000},
                {"patient_name": "TEST_Q2_Jun", "surgery_name": "TEST_Surgery", "date": "15/06/2026", "anaesthesia_fees": 3000},
                {"patient_name": "TEST_Q3_Jul", "surgery_name": "TEST_Surgery", "date": "15/07/2026", "anaesthesia_fees": 4000},
            ]
            
            created_ids = []
            for case in test_cases:
                resp = api_client.post(f"{base_url}/api/cases", json=case)
                if resp.status_code == 200:
                    created_ids.append(resp.json()["id"])

            # Export Q2 2026 CSV
            response = api_client.get(f"{base_url}/api/cases/export/csv?period=quarterly&year=2026&quarter=2")
            print(f"✓ CSV export Q2 2026 status: {response.status_code}")
            assert response.status_code == 200

            # Check filename
            assert "cases_Q2_2026.csv" in response.headers.get("content-disposition", "")
            print(f"✓ CSV filename correct: cases_Q2_2026.csv")

            # Check CSV content
            csv_text = response.text
            assert "TEST_Q2_Apr" in csv_text
            assert "TEST_Q2_May" in csv_text
            assert "TEST_Q2_Jun" in csv_text
            assert "TEST_Q3_Jul" not in csv_text
            print(f"✓ CSV contains only Q2 2026 cases (Apr, May, Jun)")

            # Cleanup
            for case_id in created_ids:
                api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ CSV quarterly Q2 test failed: {str(e)}")
            raise

    def test_csv_export_yearly(self, api_client, base_url):
        """Test CSV export with yearly filtering for 2026"""
        try:
            # Create test cases for 2026 and 2025
            test_cases = [
                {"patient_name": "TEST_2026_Jan", "surgery_name": "TEST_Surgery", "date": "15/01/2026", "anaesthesia_fees": 1000},
                {"patient_name": "TEST_2026_Jun", "surgery_name": "TEST_Surgery", "date": "15/06/2026", "anaesthesia_fees": 2000},
                {"patient_name": "TEST_2026_Dec", "surgery_name": "TEST_Surgery", "date": "15/12/2026", "anaesthesia_fees": 3000},
                {"patient_name": "TEST_2025_Dec", "surgery_name": "TEST_Surgery", "date": "15/12/2025", "anaesthesia_fees": 4000},
            ]
            
            created_ids = []
            for case in test_cases:
                resp = api_client.post(f"{base_url}/api/cases", json=case)
                if resp.status_code == 200:
                    created_ids.append(resp.json()["id"])

            # Export 2026 CSV
            response = api_client.get(f"{base_url}/api/cases/export/csv?period=yearly&year=2026")
            print(f"✓ CSV export 2026 status: {response.status_code}")
            assert response.status_code == 200

            # Check filename
            assert "cases_2026.csv" in response.headers.get("content-disposition", "")
            print(f"✓ CSV filename correct: cases_2026.csv")

            # Check CSV content
            csv_text = response.text
            assert "TEST_2026_Jan" in csv_text
            assert "TEST_2026_Jun" in csv_text
            assert "TEST_2026_Dec" in csv_text
            assert "TEST_2025_Dec" not in csv_text
            print(f"✓ CSV contains only 2026 cases")

            # Cleanup
            for case_id in created_ids:
                api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ CSV yearly test failed: {str(e)}")
            raise

    def test_csv_export_all(self, api_client, base_url):
        """Test CSV export with period=all returns all cases"""
        try:
            # Create test cases for different years
            test_cases = [
                {"patient_name": "TEST_ALL_2026", "surgery_name": "TEST_Surgery", "date": "15/01/2026", "anaesthesia_fees": 1000},
                {"patient_name": "TEST_ALL_2025", "surgery_name": "TEST_Surgery", "date": "15/12/2025", "anaesthesia_fees": 2000},
            ]
            
            created_ids = []
            for case in test_cases:
                resp = api_client.post(f"{base_url}/api/cases", json=case)
                if resp.status_code == 200:
                    created_ids.append(resp.json()["id"])

            # Export all CSV
            response = api_client.get(f"{base_url}/api/cases/export/csv?period=all")
            print(f"✓ CSV export all status: {response.status_code}")
            assert response.status_code == 200

            # Check filename
            assert "cases_all.csv" in response.headers.get("content-disposition", "")
            print(f"✓ CSV filename correct: cases_all.csv")

            # Check CSV content
            csv_text = response.text
            assert "TEST_ALL_2026" in csv_text
            assert "TEST_ALL_2025" in csv_text
            print(f"✓ CSV contains all cases regardless of year")

            # Cleanup
            for case_id in created_ids:
                api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ CSV all test failed: {str(e)}")
            raise

    def test_csv_export_default_all(self, api_client, base_url):
        """Test CSV export without period parameter defaults to all"""
        try:
            response = api_client.get(f"{base_url}/api/cases/export/csv")
            print(f"✓ CSV export default status: {response.status_code}")
            assert response.status_code == 200

            # Check filename defaults to all
            assert "cases_all.csv" in response.headers.get("content-disposition", "")
            print(f"✓ CSV export defaults to 'all' when no period specified")
        except Exception as e:
            print(f"✗ CSV default test failed: {str(e)}")
            raise


class TestCaseWithHospitalSurgeon:
    """Test cases save correctly with hospital and surgeon from dropdowns"""

    def test_create_case_with_hospital_and_surgeon(self, api_client, base_url):
        """Test creating case with hospital and surgeon from dropdowns"""
        try:
            # Create hospital and surgeon first
            hospital_payload = {"name": "TEST_Integration Hospital"}
            hospital_resp = api_client.post(f"{base_url}/api/hospitals", json=hospital_payload)
            assert hospital_resp.status_code == 200
            hospital_name = hospital_resp.json()["name"]
            hospital_id = hospital_resp.json()["id"]

            surgeon_payload = {"name": "TEST_Dr. Integration"}
            surgeon_resp = api_client.post(f"{base_url}/api/surgeons", json=surgeon_payload)
            assert surgeon_resp.status_code == 200
            surgeon_name = surgeon_resp.json()["name"]
            surgeon_id = surgeon_resp.json()["id"]

            # Create case with hospital and surgeon
            case_payload = {
                "patient_name": "TEST_Integration Patient",
                "surgery_name": "TEST_Integration Surgery",
                "hospital": hospital_name,
                "surgeon_name": surgeon_name,
                "date": "15/01/2026",
                "anaesthesia_fees": 5000
            }
            case_resp = api_client.post(f"{base_url}/api/cases", json=case_payload)
            print(f"✓ Create case with hospital/surgeon status: {case_resp.status_code}")
            assert case_resp.status_code == 200

            case_data = case_resp.json()
            assert case_data["hospital"] == hospital_name
            assert case_data["surgeon_name"] == surgeon_name
            print(f"✓ Case created with hospital: {hospital_name}")
            print(f"✓ Case created with surgeon: {surgeon_name}")

            # Verify persistence
            case_id = case_data["id"]
            get_resp = api_client.get(f"{base_url}/api/cases/{case_id}")
            assert get_resp.status_code == 200
            get_data = get_resp.json()
            assert get_data["hospital"] == hospital_name
            assert get_data["surgeon_name"] == surgeon_name
            print(f"✓ Hospital and surgeon persisted correctly in case")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{case_id}")
            api_client.delete(f"{base_url}/api/hospitals/{hospital_id}")
            api_client.delete(f"{base_url}/api/surgeons/{surgeon_id}")
        except Exception as e:
            print(f"✗ Case with hospital/surgeon test failed: {str(e)}")
            raise
