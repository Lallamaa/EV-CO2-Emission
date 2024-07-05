const brands = [
    "BMW", "Ford", "GM", "Honda", "Kia", 
    "Mazda", "Mercedes", "Nissan", "Stellantis", 
    "Subaru", "Tesla", "Toyota", "VW"
];

// Fetch data from horsepower.json
let horsepowerData = [];
fetch('src/json/horsepower.json')
    .then(response => response.json())
    .then(jsonData => {
        horsepowerData = jsonData;
        createLogos();
    })
    .catch(error => console.error('Error fetching horsepower data:', error));

// Fetch data from dataset.json
let lineChartData = [];
fetch('src/json/dataset.json')
    .then(response => response.json())
    .then(jsonData => {
        lineChartData = jsonData;
    })
    .catch(error => console.error('Error fetching line chart data:', error));

// Fetch data from area_chart_data.json
let areaChartData = [];
fetch('src/json/area.json')
    .then(response => response.json())
    .then(jsonData => {
        areaChartData = jsonData;
    })
    .catch(error => console.error('Error fetching area chart data:', error));

// Fetch data from weight.json
let weightData = [];
fetch('src/json/weight.json')
    .then(response => response.json())
    .then(data => {
        weightData = data;
        //createWeightCO2Chart();
    })
    .catch(error => console.error('Error fetching dataset:', error));

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
        img.src = `src/img/${brand.toLowerCase()}.png`; // Adjusted path for images
        img.alt = brand;
        img.className = 'logo';
        img.addEventListener('click', () => {
            displayScatterPlot(brand);
            displayLineChart(brand);
            displayAreaChart(brand);
            displayWeightCO2Chart(brand);
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
function displayAreaChart(brand) {
    const brandData = areaChartData.filter(d => d.Manufacturer === brand);
    
    // Clear previous chart content
    d3.select("#area-chart").html("");
    
    if (brandData.length === 0) {
        alert(`No data available for ${brand}`);
        return;
    }
    
    brandData.forEach(d => {
        d.Year = new Date(d['Model Year'], 0, 1); // Parse model year to date
        d['Real-World CO2 (g/mi)'] = +d['Real-World CO2 (g/mi)']; // Convert CO2 emissions to number
    });
    
    const chartContainerWidth = document.getElementById("area-chart").getBoundingClientRect().width;
    
    const svg = d3.select("#area-chart").append("svg")
        .attr("width", chartContainerWidth * 0.95) // Adjusted width to occupy 95% of the available space
        .attr("height", 400);
    
    const margin = { top: 20, right: 20, bottom: 50, left: 50 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;
    
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    
    const x = d3.scaleTime().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);
    
    x.domain(d3.extent(brandData, d => d.Year));
    y.domain([0, d3.max(brandData, d => d['Real-World CO2 (g/mi)'])]);
    
    const nestedData = d3.group(brandData, d => d['Vehicle Type']);
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    
    const area = d3.area()
        .x(d => x(d.Year))
        .y0(height)
        .y1(d => y(d['Real-World CO2 (g/mi)']));
    
    // Add the tooltip div
    const tooltip = d3.select("#area-chart")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
    
    // Append paths for each area
    nestedData.forEach((values, key) => {
        g.append("path")
            .datum(values)
            .attr("fill", color(key))
            .attr("d", area)
            .attr("opacity", 0.7)
            .on("mouseover", function (event, d) {
                const [mx, my] = d3.pointer(event);
                const yearScale = x.invert(mx);
                const closestData = values.reduce((a, b) => Math.abs(b.Year - yearScale) < Math.abs(a.Year - yearScale) ? b : a);
    
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                        
                tooltip.style("display", "block")
                    .html(`Vehicle Type: ${key}<br>Model Year: ${closestData['Model Year']}<br>Real-World CO2: ${closestData['Real-World CO2 (g/mi)']}`)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 10}px`);
        
                hoverLine.style("display", "block")
                    .attr("x1", mx)
                    .attr("x2", mx)
                    .attr("y1", 0)
                    .attr("y2", height);
    
                tooltip.html(`Vehicle Type: ${key}<br>Model Year: ${closestData['Model Year']}<br>Real-World CO2: ${closestData['Real-World CO2 (g/mi)']}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function (d) {
                tooltip.style("display", "none");
                hoverLine.style("display", "none");
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    
            g.selectAll(".dot")
                .data(values)
                .enter().append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.Year))
                .attr("cy", d => y(d['Real-World CO2 (g/mi)']))
                .attr("r", 3)
                .attr("fill", color(key))
                .on("mouseover", function(event, d) {
                    tooltip.style("display", "block")
                        .html(`Vehicle Type: ${key}<br>Model Year: ${d['Model Year']}<br>Real-World CO2: ${d['Real-World CO2 (g/mi)']}`)
                        .style("left", `${event.pageX + 10}px`)
                        .style("top", `${event.pageY - 10}px`);
                })
                .on("mouseout", () => tooltip.style("display", "none"));
    });
    
    // Add the X Axis
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
    
    // Add the Y Axis
    g.append("g")
        .call(d3.axisLeft(y));
    
    // Add chart title
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text(`${brand} CO2 Emissions Distribution by Model Year`);

    // Add legend
    //const legend = svg.append("g")
    //    .attr("class", "legend")
    //    .attr("transform", `translate(${width + margin.right - 20},${margin.top})`);

    //const legendEntries = Array.from(nestedData.keys());

    //legendEntries.forEach((key, index) => {
    //    const legendRow = legend.append("g")
    //        .attr("transform", `translate(0,${index * 20})`);

    //    legendRow.append("rect")
    //        .attr("width", 10)
    //        .attr("height", 10)
    //        .attr("fill", color(key));

    //    legendRow.append("text")
    //        .attr("x", -10)
    //        .attr("y", 10)
    //        .attr("text-anchor", "end")
    //        .style("text-transform", "capitalize")
    //        .text(key);
    //});
}

function displayWeightCO2Chart(brand) {
    const brandData = weightData.filter(d => d.Manufacturer === brand);

    if (brandData.length === 0) {
        alert(`No data available for ${brand}`);
        return;
    }

    const weights = brandData.map(d => d['Weight (lbs)']);
    const co2_emissions = brandData.map(d => d['Real-World CO2 (g/mi)']);

    const trace = {
        x: weights,
        y: co2_emissions,
        mode: 'markers',
        type: 'scatter',
        marker: {
            size: 12,
            color: 'blue', // You can customize the color here
            opacity: 0.7
        },
        text: brandData.map(d => `${brand}<br>Weight: ${d['Weight (lbs)']} lbs<br>CO2 Emissions: ${d['Real-World CO2 (g/mi)']} g/mi`),
        hoverinfo: 'text'
    };

    const layout = {
        title: `${brand} Weight vs Real-World CO2`,
        xaxis: { title: 'Weight (lbs)' },
        yaxis: { title: 'Real-World CO2 (g/mi)' }
    };

    Plotly.newPlot('weight-chart', [trace], layout);
}

