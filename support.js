document.addEventListener('DOMContentLoaded', () => {
    const cityFilter = document.getElementById('city-filter');
    const specialtyFilter = document.getElementById('specialty-filter');
    const contactList = document.getElementById('contact-list');

    let allHospitals = [];

    // Fetch data and initialize
    fetch('contacts.json')
        .then(response => response.json())
        .then(data => {
            allHospitals = data;
            populateFilters(data);
            renderContacts(data.filter(h => h.city === 'Chennai')); // Initially show Chennai
        })
        .catch(error => {
            console.error('Error fetching contact data:', error);
            contactList.innerHTML = '<p class="error-msg">Could not load hospital data.</p>';
        });

    function populateFilters(hospitals) {
        const cities = [...new Set(hospitals.map(h => h.city))];
        const specialties = [...new Set(hospitals.flatMap(h => h.specialties_available))].sort();

        // Populate cities
        cityFilter.innerHTML = ''; // Clear existing
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            if (city === 'Chennai') {
                option.selected = true;
            }
            cityFilter.appendChild(option);
        });

        // Populate specialties
        specialtyFilter.innerHTML = '<option value="all">All Specialties</option>'; // Clear and add default
        specialties.forEach(spec => {
            const option = document.createElement('option');
            option.value = spec;
            option.textContent = spec;
            specialtyFilter.appendChild(option);
        });
    }

    function renderContacts(hospitals) {
        contactList.innerHTML = '';
        if (hospitals.length === 0) {
            contactList.innerHTML = '<p class="empty-state">No hospitals match the selected criteria.</p>';
            return;
        }

        hospitals.forEach(hospital => {
            const card = document.createElement('div');
            card.className = 'contact-card';

            const specialtiesHtml = hospital.specialties_available.map(spec => `<li>${spec}</li>`).join('');

            card.innerHTML = `
                <h3 class="hospital-name">${hospital.hospital}</h3>
                <p class="hospital-city">${hospital.city}</p>
                <div class="contact-details">
                    <span class="material-symbols-rounded">call</span>
                    <a href="tel:${hospital.contact}">${hospital.contact}</a>
                </div>
                <div class="specialties-section">
                    <h4>Specialties Available:</h4>
                    <ul class="specialties-list">
                        ${specialtiesHtml}
                    </ul>
                </div>
            `;
            contactList.appendChild(card);
        });
    }

    function applyFilters() {
        const selectedCity = cityFilter.value;
        const selectedSpecialty = specialtyFilter.value;

        let filteredHospitals = allHospitals.filter(h => h.city === selectedCity);

        if (selectedSpecialty !== 'all') {
            filteredHospitals = filteredHospitals.filter(h => h.specialties_available.includes(selectedSpecialty));
        }

        renderContacts(filteredHospitals);
    }

    cityFilter.addEventListener('change', applyFilters);
    specialtyFilter.addEventListener('change', applyFilters);
});