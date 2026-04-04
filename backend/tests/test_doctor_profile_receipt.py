"""Backend API Tests for Doctor Profile and Receipt Features

Tests cover:
- Doctor profile endpoints (GET/PUT /api/doctor-profile)
- Receipt number auto-generation (REC-DDMM-NNN format)
- Mode of payment field in cases
- CSV export with new columns (receipt_no, payment_status, mode_of_payment)
"""

import pytest
import requests
import re
from datetime import datetime


class TestDoctorProfile:
    """Doctor profile endpoint tests"""

    def test_get_doctor_profile_exists(self, api_client, base_url):
        """Test GET /api/doctor-profile returns existing profile"""
        try:
            response = api_client.get(f"{base_url}/api/doctor-profile")
            print(f"✓ GET doctor profile status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert "name" in data
            assert "degree" in data
            assert "registration_no" in data
            assert "designation" in data
            assert "city" in data
            print(f"✓ Doctor profile structure correct")
            
            # Check if profile exists (agent note says test profile exists)
            if data.get("name"):
                print(f"✓ Existing profile found: {data['name']}")
            else:
                print(f"✓ Empty profile returned (default values)")
        except Exception as e:
            print(f"✗ GET doctor profile test failed: {str(e)}")
            raise

    def test_put_doctor_profile_create(self, api_client, base_url):
        """Test PUT /api/doctor-profile creates/updates profile"""
        try:
            payload = {
                "name": "TEST_Dr. Test Doctor",
                "degree": "MBBS, MD Anaesthesia",
                "registration_no": "TEST-12345",
                "designation": "Consultant Anaesthesiologist",
                "city": "Test City"
            }
            response = api_client.put(f"{base_url}/api/doctor-profile", json=payload)
            print(f"✓ PUT doctor profile status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert data["name"] == payload["name"]
            assert data["degree"] == payload["degree"]
            assert data["registration_no"] == payload["registration_no"]
            assert data["designation"] == payload["designation"]
            assert data["city"] == payload["city"]
            print(f"✓ Doctor profile saved successfully")

            # Verify persistence with GET
            get_response = api_client.get(f"{base_url}/api/doctor-profile")
            assert get_response.status_code == 200
            get_data = get_response.json()
            assert get_data["name"] == payload["name"]
            assert get_data["registration_no"] == payload["registration_no"]
            print(f"✓ Doctor profile persisted correctly in database")
        except Exception as e:
            print(f"✗ PUT doctor profile test failed: {str(e)}")
            raise

    def test_put_doctor_profile_update(self, api_client, base_url):
        """Test PUT /api/doctor-profile updates existing profile"""
        try:
            # First create a profile
            initial_payload = {
                "name": "TEST_Dr. Initial Name",
                "degree": "MBBS",
                "registration_no": "INIT-123",
                "designation": "Consultant",
                "city": "Initial City"
            }
            api_client.put(f"{base_url}/api/doctor-profile", json=initial_payload)

            # Update the profile
            updated_payload = {
                "name": "TEST_Dr. Updated Name",
                "degree": "MBBS, MD",
                "registration_no": "UPD-456",
                "designation": "Senior Consultant",
                "city": "Updated City"
            }
            response = api_client.put(f"{base_url}/api/doctor-profile", json=updated_payload)
            print(f"✓ PUT doctor profile update status: {response.status_code}")
            assert response.status_code == 200

            # Verify update persisted
            get_response = api_client.get(f"{base_url}/api/doctor-profile")
            get_data = get_response.json()
            assert get_data["name"] == updated_payload["name"]
            assert get_data["registration_no"] == updated_payload["registration_no"]
            print(f"✓ Doctor profile updated successfully")
        except Exception as e:
            print(f"✗ PUT doctor profile update test failed: {str(e)}")
            raise


class TestReceiptNumber:
    """Receipt number auto-generation tests"""

    def test_case_has_receipt_number(self, api_client, base_url):
        """Test POST /api/cases returns auto-generated receipt_no"""
        try:
            payload = {
                "patient_name": "TEST_Receipt Patient",
                "age": 45,
                "gender": "Male",
                "surgery_name": "TEST_Receipt Surgery",
                "surgeon_name": "Dr. Receipt",
                "hospital": "Receipt Hospital",
                "date": "20/01/2026",
                "anaesthesia_type": "General",
                "anaesthesia_fees": 5000,
                "notes": "Test receipt number generation"
            }
            response = api_client.post(f"{base_url}/api/cases", json=payload)
            print(f"✓ Create case status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert "receipt_no" in data
            assert data["receipt_no"] != ""
            print(f"✓ Receipt number generated: {data['receipt_no']}")

            # Verify receipt number format: REC-DDMM-NNN
            receipt_pattern = r'^REC-\d{4}-\d{3}$'
            assert re.match(receipt_pattern, data["receipt_no"]), f"Receipt number format invalid: {data['receipt_no']}"
            print(f"✓ Receipt number format correct (REC-DDMM-NNN)")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{data['id']}")
        except Exception as e:
            print(f"✗ Receipt number test failed: {str(e)}")
            raise

    def test_receipt_number_persistence(self, api_client, base_url):
        """Test receipt_no persists in database"""
        try:
            payload = {
                "patient_name": "TEST_Receipt Persist",
                "age": 50,
                "gender": "Female",
                "surgery_name": "TEST_Persist Surgery",
                "surgeon_name": "Dr. Persist",
                "hospital": "Persist Hospital",
                "date": "21/01/2026",
                "anaesthesia_type": "Regional",
                "anaesthesia_fees": 6000,
                "notes": "Test receipt persistence"
            }
            create_response = api_client.post(f"{base_url}/api/cases", json=payload)
            assert create_response.status_code == 200
            created_data = create_response.json()
            case_id = created_data["id"]
            receipt_no = created_data["receipt_no"]

            # GET to verify receipt_no persisted
            get_response = api_client.get(f"{base_url}/api/cases/{case_id}")
            assert get_response.status_code == 200
            get_data = get_response.json()
            assert get_data["receipt_no"] == receipt_no
            print(f"✓ Receipt number persisted correctly: {receipt_no}")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ Receipt persistence test failed: {str(e)}")
            raise


class TestModeOfPayment:
    """Mode of payment field tests"""

    def test_case_with_mode_of_payment(self, api_client, base_url):
        """Test POST /api/cases accepts mode_of_payment field"""
        try:
            payment_modes = ["Cash", "UPI", "Cheque", "Bank Transfer"]
            
            for mode in payment_modes:
                payload = {
                    "patient_name": f"TEST_Payment_{mode}",
                    "age": 40,
                    "gender": "Male",
                    "surgery_name": f"TEST_{mode}_Surgery",
                    "surgeon_name": "Dr. Payment",
                    "hospital": "Payment Hospital",
                    "date": "22/01/2026",
                    "anaesthesia_type": "General",
                    "anaesthesia_fees": 4000,
                    "mode_of_payment": mode,
                    "notes": f"Test {mode} payment"
                }
                response = api_client.post(f"{base_url}/api/cases", json=payload)
                print(f"✓ Create case with {mode} status: {response.status_code}")
                assert response.status_code == 200

                data = response.json()
                assert "mode_of_payment" in data
                assert data["mode_of_payment"] == mode
                print(f"✓ Mode of payment '{mode}' saved correctly")

                # Cleanup
                api_client.delete(f"{base_url}/api/cases/{data['id']}")
        except Exception as e:
            print(f"✗ Mode of payment test failed: {str(e)}")
            raise

    def test_case_default_mode_of_payment(self, api_client, base_url):
        """Test default mode_of_payment is 'Cash' when not provided"""
        try:
            payload = {
                "patient_name": "TEST_Default Payment",
                "age": 35,
                "gender": "Female",
                "surgery_name": "TEST_Default Surgery",
                "surgeon_name": "Dr. Default",
                "hospital": "Default Hospital",
                "date": "23/01/2026",
                "anaesthesia_type": "General",
                "anaesthesia_fees": 3500,
                "notes": "Test default payment mode"
            }
            response = api_client.post(f"{base_url}/api/cases", json=payload)
            print(f"✓ Create case without mode_of_payment status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert data["mode_of_payment"] == "Cash"
            print(f"✓ Default mode_of_payment is 'Cash'")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{data['id']}")
        except Exception as e:
            print(f"✗ Default mode of payment test failed: {str(e)}")
            raise

    def test_mode_of_payment_persistence(self, api_client, base_url):
        """Test mode_of_payment persists in database"""
        try:
            payload = {
                "patient_name": "TEST_Payment Persist",
                "age": 45,
                "gender": "Male",
                "surgery_name": "TEST_Persist Payment Surgery",
                "surgeon_name": "Dr. Persist",
                "hospital": "Persist Hospital",
                "date": "24/01/2026",
                "anaesthesia_type": "Regional",
                "anaesthesia_fees": 5500,
                "mode_of_payment": "UPI",
                "notes": "Test payment mode persistence"
            }
            create_response = api_client.post(f"{base_url}/api/cases", json=payload)
            assert create_response.status_code == 200
            case_id = create_response.json()["id"]

            # GET to verify mode_of_payment persisted
            get_response = api_client.get(f"{base_url}/api/cases/{case_id}")
            assert get_response.status_code == 200
            get_data = get_response.json()
            assert get_data["mode_of_payment"] == "UPI"
            print(f"✓ Mode of payment persisted correctly: UPI")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ Mode of payment persistence test failed: {str(e)}")
            raise


class TestCSVExportNewColumns:
    """CSV export with new columns tests"""

    def test_csv_export_includes_new_columns(self, api_client, base_url):
        """Test CSV export includes receipt_no, payment_status, mode_of_payment"""
        try:
            # Create a test case with all new fields
            payload = {
                "patient_name": "TEST_CSV_New_Columns",
                "age": 55,
                "gender": "Male",
                "surgery_name": "TEST_CSV_Surgery",
                "surgeon_name": "Dr. CSV",
                "hospital": "CSV Hospital",
                "date": "25/01/2026",
                "anaesthesia_type": "General",
                "anaesthesia_fees": 7000,
                "payment_status": "paid",
                "mode_of_payment": "UPI",
                "notes": "CSV export test"
            }
            create_response = api_client.post(f"{base_url}/api/cases", json=payload)
            assert create_response.status_code == 200
            case_id = create_response.json()["id"]
            receipt_no = create_response.json()["receipt_no"]

            # Export CSV
            response = api_client.get(f"{base_url}/api/cases/export/csv")
            print(f"✓ CSV export status: {response.status_code}")
            assert response.status_code == 200

            csv_text = response.text
            lines = csv_text.strip().split('\n')
            header = lines[0]

            # Verify new columns in header
            assert "Receipt No" in header
            assert "Payment Status" in header
            assert "Mode of Payment" in header
            print(f"✓ CSV header includes new columns: Receipt No, Payment Status, Mode of Payment")

            # Verify data row includes new values
            assert receipt_no in csv_text
            assert "paid" in csv_text
            assert "UPI" in csv_text
            print(f"✓ CSV data includes receipt_no, payment_status, mode_of_payment values")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ CSV export new columns test failed: {str(e)}")
            raise
