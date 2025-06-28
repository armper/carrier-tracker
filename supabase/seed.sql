-- Sample data for development

-- Insert sample carrier data
insert into public.carriers (dot_number, legal_name, dba_name, physical_address, phone, safety_rating, insurance_status, authority_status, carb_compliance) values
('123456', 'ABC Transport LLC', 'ABC Express', '123 Main St, Dallas, TX 75201', '(555) 123-4567', 'Satisfactory', 'Active', 'Active', true),
('789012', 'XYZ Logistics Inc', 'XYZ Freight', '456 Oak Ave, Los Angeles, CA 90210', '(555) 987-6543', 'Satisfactory', 'Active', 'Active', true),
('345678', 'Swift Carriers Corp', null, '789 Pine Rd, Chicago, IL 60601', '(555) 456-7890', 'Conditional', 'Active', 'Active', false),
('901234', 'Reliable Trucking LLC', 'Reliable Express', '321 Elm St, Miami, FL 33101', '(555) 234-5678', 'Satisfactory', 'Active', 'Active', true),
('567890', 'National Freight Co', null, '654 Maple Dr, Phoenix, AZ 85001', '(555) 345-6789', 'Unsatisfactory', 'Inactive', 'Active', false),
('112233', 'Mountain Express Logistics', 'Mountain Express', '890 Summit Dr, Denver, CO 80201', '(555) 111-2233', 'Satisfactory', 'Active', 'Active', true),
('445566', 'Coastal Freight Services', null, '567 Harbor Blvd, San Francisco, CA 94102', '(555) 444-5566', 'Satisfactory', 'Active', 'Active', true),
('778899', 'Midwest Haulers Inc', 'Midwest Express', '234 Prairie Ave, Kansas City, MO 64111', '(555) 777-8899', 'Conditional', 'Active', 'Revoked', false),
('998877', 'Southern Transport Co', 'Southern Logistics', '345 Magnolia St, Atlanta, GA 30309', '(555) 998-8877', 'Satisfactory', 'Active', 'Active', true),
('556644', 'Interstate Carriers LLC', null, '678 Highway 1, Las Vegas, NV 89101', '(555) 556-6644', 'Unsatisfactory', 'Inactive', 'Active', false);