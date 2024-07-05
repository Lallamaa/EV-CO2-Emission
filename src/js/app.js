// Load external data using Promises
Promise.all([
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
    d3.csv("EVsales.csv")
]).then(([dataGeo, data]) => {
    console.log('Data loaded:', data);
    // Process data
    data.forEach(d => {
        d.year = +d.year;
        d.value = +d.value;
        // Add geo information from dataGeo
        const country = dataGeo.features.find(feature => feature.properties.name === d.region);
        if (country) {
            const [lon, lat] = d3.geoCentroid(country);
            d.lon = lon;
            d.lat = lat;
        } else {
            d.lon = null;
            d.lat = null;
        }
    });

    // Calculate the total sales volume for each country
    const totalSalesByCountry = d3.rollup(data, v => d3.sum(v, d => d.value), d => d.region);

    // Calculate the min and max sales volumes for color scaling
    const minSales = d3.min(Array.from(totalSalesByCountry.values()));
    const maxSales = d3.max(Array.from(totalSalesByCountry.values()));

    const years = Array.from(new Set(data.map(d => d.year)));
    const yearSelect = d3.select("#carouselExampleIndicators").select(".carousel-item.active").select("#year");
    const powertrainSelect = d3.select("#carouselExampleIndicators").select(".carousel-item.active").select("#powertrain-filter");

    const initialYear = years[0];
    const initialPowertrain = "All";
    updateVisualizations(initialYear, initialPowertrain);

    yearSelect.on("input", () => {
        const selectedYear = +yearSelect.property("value");
        const selectedPowertrain = powertrainSelect.select('input[name="powertrain"]:checked').property("value");
        updateVisualizations(selectedYear, selectedPowertrain);
        d3.select("#carouselExampleIndicators").select(".carousel-item.active").select("#yearValue").text(selectedYear);
    });

    powertrainSelect.selectAll('input[name="powertrain"]').on("change", () => {
        const selectedYear = +yearSelect.property("value");
        const selectedPowertrain = powertrainSelect.select('input[name="powertrain"]:checked').property("value");
        updateVisualizations(selectedYear, selectedPowertrain);
    });

    function updateVisualizations(year, powertrain) {
        updateMap(year, powertrain);
        updateBarChart(powertrain);
    }

    function updateMap(year, powertrain) {
        // Filter data up to the selected year
        let filteredData = data.filter(d => d.year <= year);
        if (powertrain !== "All") {
            filteredData = filteredData.filter(d => d.powertrain === powertrain);
        }

        // Sum up sales for each country up to the selected year
        const cumulativeSalesByCountry = d3.rollup(filteredData, v => d3.sum(v, d => d.value), d => d.region);

        const width = 960, height = 500;
        const projection = d3.geoMercator()
            .scale((width - 3) / (2 * Math.PI))
            .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);
        const svg = d3.select("#carouselExampleIndicators").select(".carousel-item.active").select("#map").selectAll("svg").data([null]);
        const svgEnter = svg.enter().append("svg")
            .attr("width", width)
            .attr("height", height);

        svgEnter.append("g").attr("class", "countries");
        const countries = svg.merge(svgEnter).select(".countries");

        // Create a logarithmic color scale with more shades of green
        const colorScale = d3.scaleSequential(d3.interpolateGreens)
            .domain([Math.log(minSales), Math.log(maxSales)]);

        const tooltip = d3.select("#carouselExampleIndicators").select(".carousel-item.active").select("#map").selectAll(".tooltip").data([null]);
        tooltip.enter().append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        countries.selectAll("path")
            .data(dataGeo.features)
            .join("path")
            .data(dataGeo.features.filter(d => d.properties.name !== "Antarctica")) // Filter out Antarctica
            .attr("d", path)
            .attr("fill", d => {
                const cumulativeSales = cumulativeSalesByCountry.get(d.properties.name);
                return cumulativeSales ? colorScale(Math.log(cumulativeSales)) : "#ccc";
            })
            .attr("stroke", "#333")
            .on("mouseover", function(event, d) {
                const cumulativeSales = cumulativeSalesByCountry.get(d.properties.name) || 0;
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`<strong>${d.properties.name}</strong><br>Cumulative Sales: ${cumulativeSales}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }

    function updateBarChart(powertrain) {
        let filteredData = data;
        if (powertrain !== "All") {
            filteredData = filteredData.filter(d => d.powertrain === powertrain);
        }
    
        const groupedData = d3.rollup(filteredData, v => d3.sum(v, d => d.value), d => d.year);
        const barData = Array.from(groupedData, ([year, value]) => ({ year, value }));
    
        const margin = { top: 20, right: 30, bottom: 40, left: 60 },
              width = 960 - margin.left - margin.right,
              height = 500 - margin.top - margin.bottom;
    
        const svg = d3.select("#carouselExampleIndicators").select(".carousel-item.active").select("#barchart").selectAll("svg").data([null]);
        const svgEnter = svg.enter().append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    
        svgEnter.append("text")
            .attr("x", (width + margin.left + margin.right) / 2)
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .text("EV population growth over the year"); // Replace with your desired title
    
        svgEnter.append("g").attr("class", "x-axis");
        svgEnter.append("g").attr("class", "y-axis");
    
        const x = d3.scaleBand()
            .domain(barData.map(d => d.year))
            .range([0, width])
            .padding(0.1);
    
        const y = d3.scaleLinear()
            .domain([0, d3.max(barData, d => d.value)]).nice()
            .range([height, 0]);
    
        svg.merge(svgEnter).select(".x-axis")
            .attr("transform", `translate(0,${height})`)
            .transition()
            .duration(1000)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")));
    
        svg.merge(svgEnter).select(".y-axis")
            .transition()
            .duration(1000)
            .call(d3.axisLeft(y).ticks(10).tickFormat(d3.format(".2s")));
    
        const bars = svg.merge(svgEnter).selectAll(".bar")
            .data(barData, d => d.year);
    
        bars.enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.year))
            .attr("y", height)
            .attr("width", x.bandwidth())
            .attr("height", 0)
            .attr("fill", "green")
            .merge(bars)
            .transition()
            .duration(1000)
            .attr("x", d => x(d.year))
            .attr("y", d => y(d.value))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.value));
    
        bars.exit().transition().duration(1000)
            .attr("y", height)
            .attr("height", 0)
            .remove();
    }

    function autoCycleYears() {
        let yearIndex = 0;
        setInterval(() => {
            const selectedYear = years[yearIndex];
            const selectedPowertrain = powertrainSelect.select('input[name="powertrain"]:checked').property("value");
            updateVisualizations(selectedYear, selectedPowertrain);
            yearSelect.property("value", selectedYear);
            d3.select("#carouselExampleIndicators").select(".carousel-item.active").select("#yearValue").text(selectedYear);
            yearIndex = (yearIndex + 1) % years.length;
        }, 3000); // Change every 3 seconds
    }

    autoCycleYears();
}).catch(error => {
    console.error('Error loading data:', error);
});
