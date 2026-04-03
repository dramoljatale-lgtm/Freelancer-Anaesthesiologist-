"""Backend API Tests for ISA-RVG Fee Calculator

Tests cover:
- Health check endpoint
- Case CRUD operations (Create, Read, List, Delete)
- CSV export functionality
- ISA-RVG calculation data persistence
"""

import pytest
import requests
import time


class TestHealthCheck:
    """API health check tests"""

    def test_api_root(self, api_client, base_url):
        """Test API root endpoint returns success"""
        try:
            response = api_client.get(f"{base_url}/api/")
            print(f"✓ API root status: {response.status_code}")
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            print(f"✓ API root message: {data['message']}")
        except Exception as e:
            print(f"✗ API root test failed: {str(e)}")
            raise


class TestCaseCRUD:
    """Case CRUD operation tests"""

    def test_create_case_basic(self, api_client, base_url):
        """Test creating a basic case without ISA-RVG details"""
        try:
            payload = {
                "patient_name": "TEST_John Doe",
                "age": 45,
                "gender": "Male",
                "surgery_name": "TEST_Appendectomy",
                "surgeon_name": "Dr. Smith",
                "hospital": "City Hospital",
                "date": "15/01/2026",
                "anaesthesia_type": "General",
                "anaesthesia_fees": 5000,
                "notes": "Test case for basic functionality"
            }
            response = api_client.post(f"{base_url}/api/cases", json=payload)
            print(f"✓ Create case status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert "id" in data
            assert data["patient_name"] == payload["patient_name"]
            assert data["surgery_name"] == payload["surgery_name"]
            assert data["anaesthesia_fees"] == payload["anaesthesia_fees"]
            assert "created_at" in data
            print(f"✓ Case created with ID: {data['id']}")

            # Verify persistence with GET
            case_id = data["id"]
            get_response = api_client.get(f"{base_url}/api/cases/{case_id}")
            assert get_response.status_code == 200
            get_data = get_response.json()
            assert get_data["patient_name"] == payload["patient_name"]
            print(f"✓ Case persisted correctly in database")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ Create basic case test failed: {str(e)}")
            raise

    def test_create_case_with_isa_rvg(self, api_client, base_url):
        """Test creating a case with ISA-RVG calculation details"""
        try:
            payload = {
                "patient_name": "TEST_Jane Smith",
                "age": 60,
                "gender": "Female",
                "surgery_name": "TEST_Total Hip Replacement",
                "surgeon_name": "Dr. Kumar",
                "hospital": "Apollo Hospital",
                "date": "16/01/2026",
                "anaesthesia_type": "Regional",
                "anaesthesia_fees": 6400,
                "notes": "ISA-RVG calculated case",
                "isa_rvg_details": {
                    "city_tier": "Tier 3 — ₹400/unit",
                    "rate_per_unit": 400,
                    "surgical_complexity": "Major — 12 Units",
                    "base_units": 12,
                    "duration_minutes": 90,
                    "time_units": 2,
                    "asa_status": True,
                    "asa_units": 2,
                    "emergency": False,
                    "case_cancelled": False,
                    "total_units": 16,
                    "base_fee": 6400,
                    "final_fee": 6400
                }
            }
            response = api_client.post(f"{base_url}/api/cases", json=payload)
            print(f"✓ Create ISA-RVG case status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert "id" in data
            assert data["patient_name"] == payload["patient_name"]
            assert data["isa_rvg_details"] is not None
            assert data["isa_rvg_details"]["total_units"] == 16
            assert data["isa_rvg_details"]["base_units"] == 12
            assert data["isa_rvg_details"]["time_units"] == 2
            assert data["isa_rvg_details"]["asa_units"] == 2
            print(f"✓ ISA-RVG details saved correctly")

            # Verify ISA-RVG data persistence
            case_id = data["id"]
            get_response = api_client.get(f"{base_url}/api/cases/{case_id}")
            assert get_response.status_code == 200
            get_data = get_response.json()
            assert get_data["isa_rvg_details"]["total_units"] == 16
            assert get_data["isa_rvg_details"]["final_fee"] == 6400
            print(f"✓ ISA-RVG details persisted correctly")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ Create ISA-RVG case test failed: {str(e)}")
            raise

    def test_create_case_with_emergency_surcharge(self, api_client, base_url):
        """Test ISA-RVG calculation with emergency 30% surcharge"""
        try:
            payload = {
                "patient_name": "TEST_Emergency Patient",
                "age": 35,
                "gender": "Male",
                "surgery_name": "TEST_Emergency Laparotomy",
                "surgeon_name": "Dr. Patel",
                "hospital": "Emergency Hospital",
                "date": "16/01/2026",
                "anaesthesia_type": "General",
                "anaesthesia_fees": 8320,
                "notes": "Emergency case with 30% surcharge",
                "isa_rvg_details": {
                    "city_tier": "Tier 3 — ₹400/unit",
                    "rate_per_unit": 400,
                    "surgical_complexity": "Major — 12 Units",
                    "base_units": 12,
                    "duration_minutes": 90,
                    "time_units": 2,
                    "asa_status": True,
                    "asa_units": 2,
                    "emergency": True,
                    "case_cancelled": False,
                    "total_units": 16,
                    "base_fee": 6400,
                    "final_fee": 8320
                }
            }
            response = api_client.post(f"{base_url}/api/cases", json=payload)
            print(f"✓ Create emergency case status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert data["isa_rvg_details"]["emergency"] is True
            assert data["isa_rvg_details"]["base_fee"] == 6400
            assert data["isa_rvg_details"]["final_fee"] == 8320
            print(f"✓ Emergency surcharge (30%) applied correctly: ₹6400 → ₹8320")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{data['id']}")
        except Exception as e:
            print(f"✗ Emergency surcharge test failed: {str(e)}")
            raise

    def test_get_all_cases(self, api_client, base_url):
        """Test retrieving all cases"""
        try:
            response = api_client.get(f"{base_url}/api/cases")
            print(f"✓ Get all cases status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Retrieved {len(data)} cases from database")

            # Verify no MongoDB _id in response
            if len(data) > 0:
                assert "_id" not in data[0]
                print(f"✓ MongoDB _id properly excluded from response")
        except Exception as e:
            print(f"✗ Get all cases test failed: {str(e)}")
            raise

    def test_get_single_case(self, api_client, base_url):
        """Test retrieving a single case by ID"""
        try:
            # Create a test case first
            payload = {
                "patient_name": "TEST_Single Case",
                "age": 50,
                "gender": "Female",
                "surgery_name": "TEST_Knee Surgery",
                "surgeon_name": "Dr. Lee",
                "hospital": "Ortho Hospital",
                "date": "17/01/2026",
                "anaesthesia_type": "Regional",
                "anaesthesia_fees": 4000,
                "notes": "Test single case retrieval"
            }
            create_response = api_client.post(f"{base_url}/api/cases", json=payload)
            assert create_response.status_code == 200
            case_id = create_response.json()["id"]

            # Get the case
            response = api_client.get(f"{base_url}/api/cases/{case_id}")
            print(f"✓ Get single case status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert data["id"] == case_id
            assert data["patient_name"] == payload["patient_name"]
            assert data["surgery_name"] == payload["surgery_name"]
            assert "_id" not in data
            print(f"✓ Single case retrieved correctly")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ Get single case test failed: {str(e)}")
            raise

    def test_get_nonexistent_case(self, api_client, base_url):
        """Test retrieving a non-existent case returns 404"""
        try:
            fake_id = "nonexistent-case-id-12345"
            response = api_client.get(f"{base_url}/api/cases/{fake_id}")
            print(f"✓ Get nonexistent case status: {response.status_code}")
            assert response.status_code == 404

            data = response.json()
            assert "detail" in data
            print(f"✓ 404 error returned for nonexistent case")
        except Exception as e:
            print(f"✗ Get nonexistent case test failed: {str(e)}")
            raise

    def test_delete_case(self, api_client, base_url):
        """Test deleting a case"""
        try:
            # Create a test case
            payload = {
                "patient_name": "TEST_Delete Case",
                "age": 40,
                "gender": "Male",
                "surgery_name": "TEST_Delete Surgery",
                "surgeon_name": "Dr. Delete",
                "hospital": "Delete Hospital",
                "date": "18/01/2026",
                "anaesthesia_type": "General",
                "anaesthesia_fees": 3000,
                "notes": "Test delete functionality"
            }
            create_response = api_client.post(f"{base_url}/api/cases", json=payload)
            assert create_response.status_code == 200
            case_id = create_response.json()["id"]

            # Delete the case
            delete_response = api_client.delete(f"{base_url}/api/cases/{case_id}")
            print(f"✓ Delete case status: {delete_response.status_code}")
            assert delete_response.status_code == 200

            delete_data = delete_response.json()
            assert "message" in delete_data
            print(f"✓ Case deleted successfully")

            # Verify case is deleted (should return 404)
            get_response = api_client.get(f"{base_url}/api/cases/{case_id}")
            assert get_response.status_code == 404
            print(f"✓ Deleted case returns 404 on GET")
        except Exception as e:
            print(f"✗ Delete case test failed: {str(e)}")
            raise

    def test_delete_nonexistent_case(self, api_client, base_url):
        """Test deleting a non-existent case returns 404"""
        try:
            fake_id = "nonexistent-delete-id-99999"
            response = api_client.delete(f"{base_url}/api/cases/{fake_id}")
            print(f"✓ Delete nonexistent case status: {response.status_code}")
            assert response.status_code == 404

            data = response.json()
            assert "detail" in data
            print(f"✓ 404 error returned for deleting nonexistent case")
        except Exception as e:
            print(f"✗ Delete nonexistent case test failed: {str(e)}")
            raise


class TestCSVExport:
    """CSV export functionality tests"""

    def test_csv_export(self, api_client, base_url):
        """Test CSV export endpoint returns valid CSV data"""
        try:
            response = api_client.get(f"{base_url}/api/cases/export/csv")
            print(f"✓ CSV export status: {response.status_code}")
            assert response.status_code == 200

            # Check content type
            assert "text/csv" in response.headers.get("content-type", "")
            print(f"✓ CSV content-type header correct")

            # Check content disposition header
            assert "attachment" in response.headers.get("content-disposition", "")
            assert "cases_export.csv" in response.headers.get("content-disposition", "")
            print(f"✓ CSV download headers correct")

            # Check CSV content
            csv_text = response.text
            assert len(csv_text) > 0
            lines = csv_text.strip().split('\n')
            assert len(lines) >= 1  # At least header row

            # Verify header row
            header = lines[0]
            assert "Patient Name" in header
            assert "Surgery" in header
            assert "Fees" in header
            print(f"✓ CSV export contains {len(lines)} rows (including header)")
        except Exception as e:
            print(f"✗ CSV export test failed: {str(e)}")
            raise

    def test_csv_export_with_data(self, api_client, base_url):
        """Test CSV export includes created case data"""
        try:
            # Create a test case
            payload = {
                "patient_name": "TEST_CSV_Export_Patient",
                "age": 55,
                "gender": "Male",
                "surgery_name": "TEST_CSV_Surgery",
                "surgeon_name": "Dr. CSV",
                "hospital": "CSV Hospital",
                "date": "19/01/2026",
                "anaesthesia_type": "General",
                "anaesthesia_fees": 7500,
                "notes": "CSV export test"
            }
            create_response = api_client.post(f"{base_url}/api/cases", json=payload)
            assert create_response.status_code == 200
            case_id = create_response.json()["id"]

            # Export CSV
            response = api_client.get(f"{base_url}/api/cases/export/csv")
            assert response.status_code == 200

            csv_text = response.text
            assert "TEST_CSV_Export_Patient" in csv_text
            assert "TEST_CSV_Surgery" in csv_text
            print(f"✓ CSV export includes created case data")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ CSV export with data test failed: {str(e)}")
            raise


class TestInputValidation:
    """Input validation tests"""

    def test_create_case_missing_required_fields(self, api_client, base_url):
        """Test creating case with missing required fields"""
        try:
            payload = {
                "age": 30,
                "gender": "Male"
            }
            response = api_client.post(f"{base_url}/api/cases", json=payload)
            print(f"✓ Missing fields validation status: {response.status_code}")
            assert response.status_code == 422  # Unprocessable Entity
            print(f"✓ Validation error returned for missing required fields")
        except Exception as e:
            print(f"✗ Missing fields validation test failed: {str(e)}")
            raise
