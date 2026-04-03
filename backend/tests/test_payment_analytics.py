"""Backend API Tests for Payment Status & Analytics Features

Tests cover:
- Payment status field in case creation
- PATCH /api/cases/{id}/payment-status endpoint
- GET /api/analytics endpoint (monthly/yearly breakdown)
"""

import pytest
import requests


class TestPaymentStatus:
    """Payment status feature tests"""

    def test_create_case_with_paid_status(self, api_client, base_url):
        """Test creating a case with payment_status='paid'"""
        try:
            payload = {
                "patient_name": "TEST_Paid_Patient",
                "age": 45,
                "gender": "Male",
                "surgery_name": "TEST_Paid_Surgery",
                "surgeon_name": "Dr. Paid",
                "hospital": "Paid Hospital",
                "date": "20/01/2026",
                "anaesthesia_type": "General",
                "anaesthesia_fees": 5000,
                "notes": "Test paid status",
                "payment_status": "paid"
            }
            response = api_client.post(f"{base_url}/api/cases", json=payload)
            print(f"✓ Create case with paid status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert data["payment_status"] == "paid"
            print(f"✓ Payment status 'paid' saved correctly")

            # Verify persistence
            case_id = data["id"]
            get_response = api_client.get(f"{base_url}/api/cases/{case_id}")
            assert get_response.status_code == 200
            get_data = get_response.json()
            assert get_data["payment_status"] == "paid"
            print(f"✓ Payment status 'paid' persisted correctly")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ Create case with paid status failed: {str(e)}")
            raise

    def test_create_case_with_pending_status(self, api_client, base_url):
        """Test creating a case with payment_status='pending'"""
        try:
            payload = {
                "patient_name": "TEST_Pending_Patient",
                "age": 50,
                "gender": "Female",
                "surgery_name": "TEST_Pending_Surgery",
                "surgeon_name": "Dr. Pending",
                "hospital": "Pending Hospital",
                "date": "21/01/2026",
                "anaesthesia_type": "Regional",
                "anaesthesia_fees": 7000,
                "notes": "Test pending status",
                "payment_status": "pending"
            }
            response = api_client.post(f"{base_url}/api/cases", json=payload)
            print(f"✓ Create case with pending status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert data["payment_status"] == "pending"
            print(f"✓ Payment status 'pending' saved correctly")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{data['id']}")
        except Exception as e:
            print(f"✗ Create case with pending status failed: {str(e)}")
            raise

    def test_create_case_default_pending_status(self, api_client, base_url):
        """Test creating a case without payment_status defaults to 'pending'"""
        try:
            payload = {
                "patient_name": "TEST_Default_Status",
                "age": 40,
                "gender": "Male",
                "surgery_name": "TEST_Default_Surgery",
                "surgeon_name": "Dr. Default",
                "hospital": "Default Hospital",
                "date": "22/01/2026",
                "anaesthesia_type": "General",
                "anaesthesia_fees": 4000,
                "notes": "Test default status"
            }
            response = api_client.post(f"{base_url}/api/cases", json=payload)
            print(f"✓ Create case without payment_status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert data["payment_status"] == "pending"
            print(f"✓ Default payment status is 'pending'")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{data['id']}")
        except Exception as e:
            print(f"✗ Default payment status test failed: {str(e)}")
            raise

    def test_update_payment_status_to_paid(self, api_client, base_url):
        """Test PATCH /api/cases/{id}/payment-status to update status to 'paid'"""
        try:
            # Create a case with pending status
            payload = {
                "patient_name": "TEST_Update_To_Paid",
                "age": 55,
                "gender": "Female",
                "surgery_name": "TEST_Update_Surgery",
                "surgeon_name": "Dr. Update",
                "hospital": "Update Hospital",
                "date": "23/01/2026",
                "anaesthesia_type": "General",
                "anaesthesia_fees": 6000,
                "payment_status": "pending"
            }
            create_response = api_client.post(f"{base_url}/api/cases", json=payload)
            assert create_response.status_code == 200
            case_id = create_response.json()["id"]

            # Update status to paid
            update_response = api_client.patch(
                f"{base_url}/api/cases/{case_id}/payment-status",
                json={"payment_status": "paid"}
            )
            print(f"✓ Update payment status to paid: {update_response.status_code}")
            assert update_response.status_code == 200

            update_data = update_response.json()
            assert update_data["payment_status"] == "paid"
            print(f"✓ Payment status updated to 'paid'")

            # Verify persistence
            get_response = api_client.get(f"{base_url}/api/cases/{case_id}")
            assert get_response.status_code == 200
            get_data = get_response.json()
            assert get_data["payment_status"] == "paid"
            print(f"✓ Updated payment status persisted correctly")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ Update payment status to paid failed: {str(e)}")
            raise

    def test_update_payment_status_to_pending(self, api_client, base_url):
        """Test PATCH /api/cases/{id}/payment-status to update status to 'pending'"""
        try:
            # Create a case with paid status
            payload = {
                "patient_name": "TEST_Update_To_Pending",
                "age": 60,
                "gender": "Male",
                "surgery_name": "TEST_Update_Surgery_2",
                "surgeon_name": "Dr. Update2",
                "hospital": "Update Hospital 2",
                "date": "24/01/2026",
                "anaesthesia_type": "Regional",
                "anaesthesia_fees": 8000,
                "payment_status": "paid"
            }
            create_response = api_client.post(f"{base_url}/api/cases", json=payload)
            assert create_response.status_code == 200
            case_id = create_response.json()["id"]

            # Update status to pending
            update_response = api_client.patch(
                f"{base_url}/api/cases/{case_id}/payment-status",
                json={"payment_status": "pending"}
            )
            print(f"✓ Update payment status to pending: {update_response.status_code}")
            assert update_response.status_code == 200

            update_data = update_response.json()
            assert update_data["payment_status"] == "pending"
            print(f"✓ Payment status updated to 'pending'")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ Update payment status to pending failed: {str(e)}")
            raise

    def test_update_payment_status_invalid_value(self, api_client, base_url):
        """Test PATCH with invalid payment_status value returns 400"""
        try:
            # Create a case
            payload = {
                "patient_name": "TEST_Invalid_Status",
                "age": 35,
                "gender": "Male",
                "surgery_name": "TEST_Invalid_Surgery",
                "surgeon_name": "Dr. Invalid",
                "hospital": "Invalid Hospital",
                "date": "25/01/2026",
                "anaesthesia_type": "General",
                "anaesthesia_fees": 3000,
                "payment_status": "pending"
            }
            create_response = api_client.post(f"{base_url}/api/cases", json=payload)
            assert create_response.status_code == 200
            case_id = create_response.json()["id"]

            # Try to update with invalid status
            update_response = api_client.patch(
                f"{base_url}/api/cases/{case_id}/payment-status",
                json={"payment_status": "invalid_status"}
            )
            print(f"✓ Invalid payment status validation: {update_response.status_code}")
            assert update_response.status_code == 400

            error_data = update_response.json()
            assert "detail" in error_data
            print(f"✓ 400 error returned for invalid payment status")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{case_id}")
        except Exception as e:
            print(f"✗ Invalid payment status test failed: {str(e)}")
            raise

    def test_update_payment_status_nonexistent_case(self, api_client, base_url):
        """Test PATCH on non-existent case returns 404"""
        try:
            fake_id = "nonexistent-case-id-99999"
            response = api_client.patch(
                f"{base_url}/api/cases/{fake_id}/payment-status",
                json={"payment_status": "paid"}
            )
            print(f"✓ Update nonexistent case status: {response.status_code}")
            assert response.status_code == 404

            data = response.json()
            assert "detail" in data
            print(f"✓ 404 error returned for nonexistent case")
        except Exception as e:
            print(f"✗ Update nonexistent case test failed: {str(e)}")
            raise


class TestAnalytics:
    """Analytics endpoint tests"""

    def test_analytics_endpoint_structure(self, api_client, base_url):
        """Test GET /api/analytics returns correct structure"""
        try:
            response = api_client.get(f"{base_url}/api/analytics")
            print(f"✓ Analytics endpoint status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert "current_month" in data
            assert "current_year" in data
            assert "monthly_breakdown" in data
            print(f"✓ Analytics response has correct structure")

            # Check current_month structure
            cm = data["current_month"]
            assert "total_cases" in cm
            assert "total_fees" in cm
            assert "received" in cm
            assert "pending" in cm
            print(f"✓ Current month stats structure correct")

            # Check current_year structure
            cy = data["current_year"]
            assert "total_cases" in cy
            assert "total_fees" in cy
            assert "received" in cy
            assert "pending" in cy
            print(f"✓ Current year stats structure correct")

            # Check monthly_breakdown is a list
            assert isinstance(data["monthly_breakdown"], list)
            print(f"✓ Monthly breakdown is a list with {len(data['monthly_breakdown'])} months")
        except Exception as e:
            print(f"✗ Analytics endpoint structure test failed: {str(e)}")
            raise

    def test_analytics_with_paid_and_pending_cases(self, api_client, base_url):
        """Test analytics correctly separates paid and pending amounts"""
        try:
            # Create a paid case
            paid_payload = {
                "patient_name": "TEST_Analytics_Paid_Verify",
                "age": 45,
                "gender": "Male",
                "surgery_name": "TEST_Analytics_Surgery_1",
                "surgeon_name": "Dr. Analytics1",
                "hospital": "Analytics Hospital",
                "date": "26/01/2026",
                "anaesthesia_type": "General",
                "anaesthesia_fees": 10000,
                "payment_status": "paid"
            }
            paid_response = api_client.post(f"{base_url}/api/cases", json=paid_payload)
            assert paid_response.status_code == 200
            paid_case_id = paid_response.json()["id"]

            # Create a pending case
            pending_payload = {
                "patient_name": "TEST_Analytics_Pending_Verify",
                "age": 50,
                "gender": "Female",
                "surgery_name": "TEST_Analytics_Surgery_2",
                "surgeon_name": "Dr. Analytics2",
                "hospital": "Analytics Hospital 2",
                "date": "26/01/2026",
                "anaesthesia_type": "Regional",
                "anaesthesia_fees": 5000,
                "payment_status": "pending"
            }
            pending_response = api_client.post(f"{base_url}/api/cases", json=pending_payload)
            assert pending_response.status_code == 200
            pending_case_id = pending_response.json()["id"]

            # Get analytics
            analytics_response = api_client.get(f"{base_url}/api/analytics")
            assert analytics_response.status_code == 200
            analytics_data = analytics_response.json()

            # Verify analytics structure and that received + pending = total_fees
            cm = analytics_data["current_month"]
            assert cm["received"] + cm["pending"] == cm["total_fees"]
            assert cm["received"] > 0  # Should have at least our paid case
            assert cm["pending"] > 0  # Should have at least our pending case
            print(f"✓ Analytics correctly separates received (₹{cm['received']}) and pending (₹{cm['pending']})")
            print(f"✓ Total fees = received + pending: ₹{cm['total_fees']} = ₹{cm['received']} + ₹{cm['pending']}")

            # Cleanup
            api_client.delete(f"{base_url}/api/cases/{paid_case_id}")
            api_client.delete(f"{base_url}/api/cases/{pending_case_id}")
        except Exception as e:
            print(f"✗ Analytics calculation test failed: {str(e)}")
            raise

    def test_analytics_monthly_breakdown_format(self, api_client, base_url):
        """Test monthly breakdown has correct format"""
        try:
            response = api_client.get(f"{base_url}/api/analytics")
            assert response.status_code == 200
            data = response.json()

            breakdown = data["monthly_breakdown"]
            if len(breakdown) > 0:
                first_month = breakdown[0]
                assert "month" in first_month
                assert "total_cases" in first_month
                assert "total_fees" in first_month
                assert "received" in first_month
                assert "pending" in first_month
                print(f"✓ Monthly breakdown items have correct format")
                print(f"✓ Example month: {first_month['month']} - {first_month['total_cases']} cases, ₹{first_month['total_fees']} total")
            else:
                print(f"✓ Monthly breakdown is empty (no cases yet)")
        except Exception as e:
            print(f"✗ Monthly breakdown format test failed: {str(e)}")
            raise
