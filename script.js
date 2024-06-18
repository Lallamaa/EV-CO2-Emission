const brands = [
    "BMW", "Ford", "GM", "Honda", "Kia", 
    "Mazda", "Mercedes", "Nissan", "Stellantis", 
    "Subaru", "Tesla", "Toyota", "VW"
];

// Fetch data from horsepower.json
let horsepowerData = [];
fetch('horsepower.json')
    .then(response => response.json())
    .then(jsonData => {
        horsepowerData = jsonData;
        createLogos();
    })
    .catch(error => console.error('Error fetching horsepower data:', error));

// Fetch data from dataset.json
let lineChartData = [];
fetch('dataset.json')
    .then(response => response.json())
    .then(jsonData => {
        lineChartData = jsonData;
    })
    .catch(error => console.error('Error fetching line chart data:', error));

// Create logo elements
function createLogos() {
    const logoContainer = document.getElementById('logo-container');
    const numLogos = brands.length;
    const containerWidth = logoContainer.offsetWidth;
    const totalMargin = containerWidth - (123 * numLogos); // Assuming each logo has a width of 100px
    

    // Calculate margin between logos
    const margin = totalMargin / (numLogos + 1);
    
    brands.forEach((brand, index) => {
        const img = document.createElement('img');
        img.src = `${brand.toLowerCase()}.png`; // Ensure you have the images stored in the same directory as your HTML file
        img.alt = brand;
        img.className = 'logo';
        img.addEventListener('click', () => {
            displayScatterPlot(brand);
            displayLineChart(brand);
        });
    
        // Set margin for the logo
        img.style.marginLeft = `${margin}px`;
        img.style.marginRight = `${margin}px`;
    
        // Add the logo to the container
        logoContainer.appendChild(img);
    });
    }

    function displayScatterPlot(brand) {
        const brandData = horsepowerData.filter(d => d.Manufacturer === brand);
    
        if (brandData.length === 0) {
            alert(`No data available for ${brand}`);
            return;
        }
    
        // Sort data by horsepower
        brandData.sort((a, b) => a["Horsepower (HP)"] - b["Horsepower (HP)"]);
    
        const vehicleTypes = [...new Set(brandData.map(d => d["Vehicle Type"]))];
        const colors = ['red', 'blue', 'green', 'purple', 'orange', 'brown', 'pink', 'cyan'];
        const typeColorMap = {};
        const legendEntries = {}; // To keep track of legend entries
    
        vehicleTypes.forEach((type, index) => {
            typeColorMap[type] = colors[index % colors.length];
            legendEntries[type] = false; // Initialize legend entries to false
        });
    
        const layout = {
            title: `${brand} Horsepower vs Real-World CO2`,
            xaxis: { title: 'Horsepower (HP)' },
            yaxis: { title: 'Real-World CO2 (g/mi)' }
        };
    
        Plotly.newPlot('plot', [], layout).then(gd => {
            const addTracesInterval = setInterval(() => {
                if (brandData.length > 0) {
                    const dataPoint = brandData.shift();
                    const trace = {
                        x: [dataPoint["Horsepower (HP)"]],
                        y: [dataPoint["Real-World CO2 (g/mi)"]],
                        mode: 'markers',
                        type: 'scatter',
                        name: dataPoint["Vehicle Type"],
                        marker: { size: 12, color: typeColorMap[dataPoint["Vehicle Type"]] },
                        showlegend: !legendEntries[dataPoint["Vehicle Type"]] // Show legend entry only if it's not shown before
                    };
                    Plotly.addTraces('plot', trace);
                    legendEntries[dataPoint["Vehicle Type"]] = true; // Mark legend entry as shown
                } else {
                    clearInterval(addTracesInterval);
                }
            }, 10); // Adjust the interval time as needed
        });
    }
    

    function displayLineChart(brand) {
        const brandData = lineChartData.filter(d => d.Manufacturer === brand);
        
        
        // Clear previous chart content
        d3.select("#chart").html("");
        
        if (brandData.length === 0) {
            alert(`No data available for ${brand}`);
            return;
        }
        
        brandData.forEach(d => {
            d.Year = new Date(d['Model Year'], 0, 1); // Parse model year to date
            d['Real-World CO2 (g/mi)'] = +d['Real-World CO2 (g/mi)']; // Convert CO2 emissions to number
        });
        
        const chartContainerWidth = document.getElementById("chart").getBoundingClientRect().width;
        
        const svg = d3.select("#chart").append("svg")
            .attr("width", chartContainerWidth * 0.95) // Adjusted width to occupy 75% of the available space
            .attr("height", 400);
        
        const margin = { top: 20, right: 20, bottom: 30, left: 50 },
            width = +svg.attr("width") - margin.left - margin.right,
            height = +svg.attr("height") - margin.top - margin.bottom;
        
        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        
        const x = d3.scaleTime().range([0, width]);
        const y = d3.scaleLinear().range([height, 0]);
        
        const line = d3.line()
            .x(d => x(d.Year))
            .y(d => y(d['Real-World CO2 (g/mi)']));
        
        x.domain(d3.extent(brandData, d => d.Year));
        y.domain([0, d3.max(brandData, d => d['Real-World CO2 (g/mi)'])]);
        
        const nestedData = d3.group(brandData, d => d['Vehicle Type']);
        
        const color = d3.scaleOrdinal(d3.schemeCategory10);
        
        const tooltip = d3.select("#chart")
            .append("div")
            .attr("class", "tooltip");
        
        const hoverLine = g.append("line")
            .attr("class", "hover-line")
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4")
            .style("display", "none");
        
            nestedData.forEach((values, key) => {
                g.append("path")
                    .datum(values)
                    .attr("fill", "none")
                    .attr("stroke", color(key))
                    .attr("stroke-width", 2)
                    .attr("d", line)
                    .on("mouseover", function(event, d) {
                        const [mx, my] = d3.pointer(event, this);
                        const yearScale = x.invert(mx);
                        const closestData = values.reduce((a, b) => Math.abs(b.Year - yearScale) < Math.abs(a.Year - yearScale) ? b : a);
            
                        tooltip.style("display", "block")
                            .style("left", `${event.pageX}px`)
                            .style("top", `${event.pageY - 28}px`)
                            .html(`Year: ${closestData.Year.getFullYear()}<br>CO2: ${closestData['Real-World CO2 (g/mi)']} g/mi`);
            
                        hoverLine.attr("x1", mx)
                            .attr("y1", 0)
                            .attr("x2", mx)
                            .attr("y2", height)
                            .style("display", null);
                    })
                    .on("mouseout", function() {
                        tooltip.style("display", "none");
                        hoverLine.style("display", "none");
                    });
            
                g.append("text")
                    .attr("x", width - 70) // Adjusted x position
                    .attr("y", 20 + (20 * Array.from(nestedData.keys()).indexOf(key)))
                    .attr("fill", color(key))
                    .text(key);
            });
        
        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .append("text")
            .attr("x", width / 2)
            .attr("y", 30)
            .attr("fill", "#000")
            .attr("font-weight", "bold")
            .attr("text-anchor", "middle")
            .text("Year");
        
        g.append("g")
            .call(d3.axisLeft(y))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left)
            .attr("x", -height / 2)
            .attr("dy", "1em")
            .attr("fill", "#000")
            .attr("font-weight", "bold")
            .attr("text-anchor", "middle")
            .text("CO2 Emission");
        
        svg.append("text")
            .attr("x", (width + margin.left + margin.right) / 2)
            .attr("y", margin.top)
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .text("Vehicle Types and Their CO2 Emissions");
        
        const averageCO2 = d3.mean(brandData, d => d['Real-World CO2 (g/mi)']);
        
        svg.append("text")
            .attr("x", width + margin.left + 60)
            .attr("y", margin.top + 50)
            .text(averageCO2.toFixed(2))
            .attr("fill", "green")
            .style("font-size", "24px");
        }
        
        
        
