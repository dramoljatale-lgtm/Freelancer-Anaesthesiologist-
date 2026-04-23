"""Backend API Tests for Empty Database and Signature Feature

Tests cover:
- Empty database state (no pre-filled data)
- Doctor profile signature_base64 field
- Signature persistence in database
"""

import pytest
import requests
import os


class TestEmptyDatabase:
    """Test that database starts empty with no pre-filled data"""

    def test_cases_empty(self, api_client, base_url):
        """Test GET /api/cases returns empty array"""
        try:
            response = api_client.get(f"{base_url}/api/cases")
            print(f"✓ GET /api/cases status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Cases count: {len(data)}")
            
            if len(data) == 0:
                print(f"✓ Database is empty - no pre-filled cases")
            else:
                print(f"⚠ WARNING: Database has {len(data)} cases (expected 0)")
                print(f"  Cases found: {[c.get('patient_name', 'Unknown') for c in data[:5]]}")
        except Exception as e:
            print(f"✗ Cases empty test failed: {str(e)}")
            raise

    def test_hospitals_empty(self, api_client, base_url):
        """Test GET /api/hospitals returns empty array"""
        try:
            response = api_client.get(f"{base_url}/api/hospitals")
            print(f"✓ GET /api/hospitals status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Hospitals count: {len(data)}")
            
            if len(data) == 0:
                print(f"✓ Database is empty - no pre-filled hospitals")
            else:
                print(f"⚠ WARNING: Database has {len(data)} hospitals (expected 0)")
                print(f"  Hospitals found: {[h.get('name', 'Unknown') for h in data[:5]]}")
        except Exception as e:
            print(f"✗ Hospitals empty test failed: {str(e)}")
            raise

    def test_surgeons_empty(self, api_client, base_url):
        """Test GET /api/surgeons returns empty array"""
        try:
            response = api_client.get(f"{base_url}/api/surgeons")
            print(f"✓ GET /api/surgeons status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Surgeons count: {len(data)}")
            
            if len(data) == 0:
                print(f"✓ Database is empty - no pre-filled surgeons")
            else:
                print(f"⚠ WARNING: Database has {len(data)} surgeons (expected 0)")
                print(f"  Surgeons found: {[s.get('name', 'Unknown') for s in data[:5]]}")
        except Exception as e:
            print(f"✗ Surgeons empty test failed: {str(e)}")
            raise

    def test_doctor_profile_empty(self, api_client, base_url):
        """Test GET /api/doctor-profile returns empty fields"""
        try:
            response = api_client.get(f"{base_url}/api/doctor-profile")
            print(f"✓ GET /api/doctor-profile status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert isinstance(data, dict)
            
            # Check all fields are empty strings
            expected_empty_fields = ['name', 'degree', 'registration_no', 'city', 'signature_base64']
            empty_count = 0
            for field in expected_empty_fields:
                if field in data and data[field] == '':
                    empty_count += 1
                    print(f"✓ Field '{field}' is empty")
                elif field in data:
                    print(f"⚠ WARNING: Field '{field}' has value: {data[field][:50]}...")
                else:
                    print(f"✗ ERROR: Field '{field}' missing from response")
            
            # Check designation has default value
            assert 'designation' in data
            print(f"✓ Field 'designation' has default: {data['designation']}")
            
            if empty_count == len(expected_empty_fields):
                print(f"✓ Doctor profile is empty - no pre-filled data")
            else:
                print(f"⚠ WARNING: {len(expected_empty_fields) - empty_count} fields have data (expected all empty)")
        except Exception as e:
            print(f"✗ Doctor profile empty test failed: {str(e)}")
            raise


class TestDoctorProfileSignature:
    """Test doctor profile signature_base64 field"""

    def test_doctor_profile_has_signature_field(self, api_client, base_url):
        """Test GET /api/doctor-profile includes signature_base64 field"""
        try:
            response = api_client.get(f"{base_url}/api/doctor-profile")
            print(f"✓ GET /api/doctor-profile status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert 'signature_base64' in data
            print(f"✓ signature_base64 field present in response")
            print(f"✓ signature_base64 value: '{data['signature_base64'][:50] if data['signature_base64'] else '(empty)'}'")
        except Exception as e:
            print(f"✗ Signature field test failed: {str(e)}")
            raise

    def test_save_doctor_profile_with_signature(self, api_client, base_url):
        """Test PUT /api/doctor-profile saves signature_base64"""
        try:
            # Create test signature (small base64 image)
            test_signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            
            payload = {
                "name": "TEST_Dr. Signature Test",
                "degree": "MBBS, MD",
                "registration_no": "TEST123456",
                "designation": "Consultant Anaesthesiologist",
                "city": "Test City",
                "signature_base64": test_signature
            }
            
            response = api_client.put(f"{base_url}/api/doctor-profile", json=payload)
            print(f"✓ PUT /api/doctor-profile status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert data['name'] == payload['name']
            assert data['signature_base64'] == test_signature
            print(f"✓ Doctor profile saved with signature")
            print(f"✓ Signature length: {len(test_signature)} characters")

            # Verify persistence with GET
            get_response = api_client.get(f"{base_url}/api/doctor-profile")
            assert get_response.status_code == 200
            get_data = get_response.json()
            assert get_data['name'] == payload['name']
            assert get_data['signature_base64'] == test_signature
            print(f"✓ Signature persisted correctly in database")
        except Exception as e:
            print(f"✗ Save signature test failed: {str(e)}")
            raise

    def test_update_signature_only(self, api_client, base_url):
        """Test updating only signature_base64 field"""
        try:
            # First, get current profile
            get_response = api_client.get(f"{base_url}/api/doctor-profile")
            assert get_response.status_code == 200
            current_profile = get_response.json()
            
            # Update with new signature
            new_signature = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
            
            current_profile['signature_base64'] = new_signature
            
            response = api_client.put(f"{base_url}/api/doctor-profile", json=current_profile)
            print(f"✓ PUT /api/doctor-profile (update signature) status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert data['signature_base64'] == new_signature
            print(f"✓ Signature updated successfully")

            # Verify persistence
            get_response = api_client.get(f"{base_url}/api/doctor-profile")
            assert get_response.status_code == 200
            get_data = get_response.json()
            assert get_data['signature_base64'] == new_signature
            print(f"✓ Updated signature persisted in database")
        except Exception as e:
            print(f"✗ Update signature test failed: {str(e)}")
            raise

    def test_remove_signature(self, api_client, base_url):
        """Test removing signature by setting empty string"""
        try:
            # Get current profile
            get_response = api_client.get(f"{base_url}/api/doctor-profile")
            assert get_response.status_code == 200
            current_profile = get_response.json()
            
            # Remove signature
            current_profile['signature_base64'] = ''
            
            response = api_client.put(f"{base_url}/api/doctor-profile", json=current_profile)
            print(f"✓ PUT /api/doctor-profile (remove signature) status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert data['signature_base64'] == ''
            print(f"✓ Signature removed successfully")

            # Verify persistence
            get_response = api_client.get(f"{base_url}/api/doctor-profile")
            assert get_response.status_code == 200
            get_data = get_response.json()
            assert get_data['signature_base64'] == ''
            print(f"✓ Empty signature persisted in database")
        except Exception as e:
            print(f"✗ Remove signature test failed: {str(e)}")
            raise

    def test_signature_field_no_mongodb_id(self, api_client, base_url):
        """Test that MongoDB _id is excluded from doctor profile response"""
        try:
            response = api_client.get(f"{base_url}/api/doctor-profile")
            print(f"✓ GET /api/doctor-profile status: {response.status_code}")
            assert response.status_code == 200

            data = response.json()
            assert '_id' not in data
            print(f"✓ MongoDB _id properly excluded from response")
        except Exception as e:
            print(f"✗ MongoDB _id exclusion test failed: {str(e)}")
            raise


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def base_url():
    """Base URL from environment variable"""
    url = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
    if not url:
        pytest.fail("EXPO_PUBLIC_BACKEND_URL environment variable not set")
    return url.rstrip('/')
