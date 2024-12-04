data = Promise.all([
  d3.csv(
    "https://raw.githubusercontent.com/carrot-123/yarn-explainer/refs/heads/main/data/yarn.csv"
  ),
  d3.csv(
    "https://raw.githubusercontent.com/carrot-123/yarn-explainer/refs/heads/main/data/yarn_fibers.csv"
  ),
]).then(([yarnData, fiberData]) => {
  // Step 1: Parse yarn.csv
  const yarnRatings = new Map();
  const yarnDataMap = new Map();
  const fiberDataMap = new Map(); // vis 3
  const other = new Set([
    "Other",
    "Metallic",
    "Angora",
    "Linen",
    "Microfiber",
    "Llama",
    "Bamboo",
    "Soy",
    "Tencel",
    "Camel",
    "Plant fiber",
    "Bison",
    "Yak",
    "Qiviut",
    "Hemp",
  ]);
  const include = new Set([
    "Cotton",
    "Nylon",
    "Wool",
    "Rayon",
    "Arylic",
    "Polyester",
    "Mohair",
    "Merino",
    "Silk",
    "Cashmere",
    "Alpaca",
  ]);
  const skip = new Set([]);
  fiberData.forEach((d) => {
    id = +d.id;
    fiber_type_name = d.fiber_type_name;
    percentage = +d.percentage;
    if (!fiberDataMap[id]) {
      fiberDataMap[id] = [];
    }
    if (!other.has(fiber_type_name) && !skip.has(id)) {
      // remove all instances of this yarn if it contains other yarn...
      fiberDataMap[id].push({ fiber_type_name, percentage });
    } else {
      skip.add(id);
    }
  });
  const fiberWash = {};

  yarnData.forEach((d) => {
    d.id = +d.id;
    d.rating_average = +d.rating_average; // Convert rating to a number
    d.rating_count = +d.rating_count;
    d.discontinued = d.discontinued;
    d.machine_washable = d.machine_washable;

    /*if (d.discontinued !== "FALSE" && d.rating_count >= 50) {
      yarnRatings.set(d.id, d.rating_average);
    }*/
    if (d.rating_count >= 50) {
      yarnRatings.set(d.id, d.rating_average);
    }
    yarnDataMap.set(d.id, d);
    if (
      fiberDataMap[d.id] &&
      d.discontinued === "FALSE" &&
      (d.machine_washable === "TRUE" || d.machine_washable === "FALSE")
    ) {
      fiberWash[d.id] = { ...d, fibers: fiberDataMap[d.id] };
    }
    //fiberWash[d.id] = { ...d, fibers: fiberDataMap[d.id] || [] };
  });

  // get if its machine washable
  const yarnFibers = {};
  fiberData.forEach((d) => {
    d.id = +d.id;
    d.percentage = +d.percentage; // Convert percentage to a number
    d.fiber_type_name = d.fiber_type_name;
    d.machine_washable = d.machine_washable;
    if (!yarnFibers[+d.id]) {
      yarnFibers[d.id] = [];
    }
    yarnFibers[d.id].push(d);
  });

  const yarnBlend = new Map(); // vis 1

  const fiberRatings = {};
  for (const [yarnId, fibers] of Object.entries(yarnFibers)) {
    const fiberNames = fibers.map((fiber) => fiber.fiber_type_name);
    const percentages = fibers.map((fiber) => fiber.percentage);

    if (fiberNames.length === 1) {
      var fiber = fiberNames[0];
      if (other.has(fiber)) {
        fiber = "Other";
      }
      if (!yarnBlend.has(fiber)) {
        yarnBlend.set(fiber, new Map());
      }
      const innerMap = yarnBlend.get(fiber);
      innerMap.set(fiber, (innerMap.get(fiber) || 0) + 1);
    } else {
      for (let i = 0; i < fiberNames.length; i++) {
        var fiber = fiberNames[i];
        // Ensure the fiber has an entry in the map
        if (other.has(fiber)) {
          fiber = "Other";
        }
        if (!yarnBlend.has(fiber)) {
          yarnBlend.set(fiber, new Map());
        }

        // Compare it with every other fiber in the same list
        for (let j = 0; j < fiberNames.length; j++) {
          if (i !== j) {
            var fiber2 = fiberNames[j];

            if (other.has(fiber2)) {
              fiber2 = "Other";
            }
            // Increment count for co-occurrence
            const innerMap = yarnBlend.get(fiber);
            innerMap.set(fiber2, (innerMap.get(fiber2) || 0) + 1);
          }
        }
      }
    }

    const rating = yarnRatings.get(fibers[0].id); // Get the rating for the current yarn
    if (rating) {
      const isSingleFiber = fibers.length === 1; // Check if the yarn is made of a single fiber
      for (let i = 0; i < fiberNames.length; i++) {
        var fiber = fiberNames[i];
        if (other.has(fiber)) {
          fiber = "Other";
        }
        var percentage = percentages[i];
        if (percentage) {
          if (!fiberRatings[fiber]) {
            fiberRatings[fiber] = {
              singleFiberRatings: [],
              multiFiberRatings: [],
              allFiberRatings: [],
              percentageRatings: {},
              percentageCounts: {},
            };
          }
          const fiberEntry = fiberRatings[fiber];
          if (isSingleFiber) {
            fiberEntry.singleFiberRatings.push(rating);
            if (!fiberEntry.percentageCounts[percentage]) {
              fiberEntry.percentageCounts[percentage] = 0;
            }
            fiberEntry.percentageCounts[percentage] += 1;
            if (!fiberEntry.percentageRatings[percentage]) {
              fiberEntry.percentageRatings[percentage] = [];
            }
            fiberEntry.percentageRatings[percentage].push(rating);
          } else {
            for (let j = 0; j < fiberNames.length; j++) {
              var fiber2 = fiberNames[j];
              if (other.has(fiber2)) {
                fiber2 = "Other";
              }
              if (!fiberEntry.percentageCounts[percentage]) {
                fiberEntry.percentageCounts[percentage] = 0;
              }
              fiberEntry.percentageCounts[percentage] += 1;
              if (!fiberEntry.percentageRatings[percentage]) {
                fiberEntry.percentageRatings[percentage] = [];
              }
              fiberEntry.percentageRatings[percentage].push(rating);
            }
            //}
            fiberEntry.multiFiberRatings.push(rating);
          }
          fiberEntry.allFiberRatings.push(rating);
        }
      }
    }
  }

  //console.log(yarnBlend);
  d3.selectAll(".active-button").classed("active", true);
  createSplitBarchart(yarnBlend);
  createRatingsChart(fiberRatings);
  createWashScatterplot(fiberWash);
});

function calculatePercentage(yarnData, fiberSource) {
  return Object.entries(yarnData).map(([yarnId, details]) => {
    const syntheticPercentage = details.fibers.reduce((total, fiber) => {
      return (
        total +
        (fiberSource[fiber.fiber_type_name] === "Synthetic"
          ? fiber.percentage
          : 0)
      );
    }, 0);
    return { id: yarnId, details: details, syntheticPercentage };
  });
}
function createWashScatterplot(fiberWash) {
  const fiberSource = {
    Nylon: "Synthetic",
    Other: "Other",
    Cotton: "Natural",
    Wool: "Natural",
    Rayon: "Synthetic",
    Acrylic: "Synthetic",
    Polyester: "Synthetic",
    Mohair: "Natural",
    Merino: "Natural",
    Silk: "Natural",
    Cashmere: "Natural",
    Alpaca: "Natural",
  };
  const yarnTemp = Object.entries(fiberWash)
    .filter(([_, details]) => {
      // Check if fiber percentages are valid
      const totalPercentage = details.fibers.reduce(
        (sum, fiber) => sum + (isNaN(fiber.percentage) ? 0 : fiber.percentage),
        0
      );
      const allPercentagesValid = details.fibers.every(
        (fiber) => !isNaN(fiber.percentage)
      );
      return allPercentagesValid && totalPercentage === 100;
    })
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});

  const yarnTemp2 = Object.entries(yarnTemp)
    .sort(([, a], [, b]) => b.rating_count - a.rating_count) // Sort by reviewCount descending
    .slice(0, 5000) // Take the top N yarns
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  const yarnData = calculatePercentage(yarnTemp2, fiberSource);

  const width = 1000;
  const height = 600;
  const margin = { top: 20, right: 30, bottom: 20, left: 20 };

  const svg = d3.select("#vis3").attr("width", width).attr("height", height);

  const chartWidth = width - margin.left - margin.right - 200;
  const chartHeight = height - margin.top - margin.bottom - 100;

  const chartGroup = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create scales
  const xScale = d3
    .scaleLinear()
    .domain([100, 0]) // 100% synthetic on the left, 0% synthetic on the right
    .range([0, chartWidth]);

  const upxScale = d3
    .scaleLinear()
    .domain([0, 100]) // 100% synthetic on the left, 0% synthetic on the right
    .range([0, chartWidth]);

  const yScale = d3
    .scalePoint()
    .domain(yarnData.map((d) => d.id)) // Use yarn IDs to randomly distribute points vertically
    .range([0, chartHeight])
    .padding(0.5);

  // Create axis generators
  const xAxis = d3.axisBottom(xScale);
  const upxAxis = d3.axisTop(upxScale);
  const yAxis = d3.axisLeft(yScale).tickFormat(""); // Hide yarn IDs on the y-axis

  // Append group for the scatterplot
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top + 30} )`);

  // Add x-axis
  g.append("g")
    .attr("transform", `translate(0,${chartHeight})`)
    .attr("class", "axis-style")
    .call(xAxis)
    .append("text")
    .attr("x", chartWidth / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Synthetic Fiber Percentage");

  g.append("g")
    .attr("transform", `translate(0,0)`)
    .attr("class", "axis-style")
    .call(upxAxis)
    .append("text")
    .attr("x", chartWidth / 2)
    .attr("y", -30)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Natural Fiber Percentage");

  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr(
      "transform",
      `translate(${margin.right + chartWidth + 80}, ${margin.top})`
    ); // Move to the right of the chart

  legend
    .append("circle")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", 6)
    .attr("fill", "#80b1d3"); //blue

  legend
    .append("text")

    .attr("x", 10)
    .attr("y", 4)
    .text("Washable")
    .style("font-size", "12px");

  legend
    .append("circle")
    .attr("cx", 0)
    .attr("cy", 20)
    .attr("r", 6)
    .attr("fill", "#fb8072"); // red

  legend
    .append("text")

    .attr("x", 10)
    .attr("y", 24)
    .text("Not Washable")
    .style("font-size", "12px");

  const tooltip = d3
    .select("body")
    .append("div")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.7)")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("visibility", "hidden")
    .style("font-size", "12px");

  function calculateMedian(data) {
    const washableData = data.filter((d) => d.details.machine_washable);
    const sortedSynthetic = washableData
      .map((d) => d.syntheticPercentage)
      .sort((a, b) => a - b);

    const mid = Math.floor(sortedSynthetic.length / 2);
    return sortedSynthetic.length % 2 === 0
      ? (sortedSynthetic[mid - 1] + sortedSynthetic[mid]) / 2
      : sortedSynthetic[mid];
  }

  // Function to update scatterplot based on selected fiber
  function updateChart() {
    const buttons = d3
      .select("#vis3-buttons")
      .selectAll(".button-container button, .label-container button");
    const activeFibers = buttons
      .filter(function () {
        return d3.select(this).classed("active");
      })
      .nodes() // Get the filtered DOM nodes
      .map((button) => button.getAttribute("data-filter")); //.data.filter;this.dataset.filter
    /*d3.select(this).classed("active") === "true"*/

    /*const filteredData = yarnData.filter((d) =>
      d.details.fibers.some((fiber) =>
        activeFibers.every((activeFiber) =>
          d.details.fibers.includes(activeFiber)
        )
      )
    );*/
    /*const filteredData = yarnData.filter((yarn) =>
      
      activeFibers.every((activeFiber) =>
        yarn.details.fibers.includes(activeFiber)
      )
    );*/
    const filteredData = yarnData.filter((yarn) => {
      // Get all fiber values from the Map
      const fiberNames = yarn.details.fibers.map(
        (fiber) => fiber.fiber_type_name
      );

      // Check if all active fibers are in the fiberNames array
      return activeFibers.every((activeFiber) =>
        fiberNames.includes(activeFiber)
      );
    });
    /*const filteredData =
      selectedFiber === "all"
        ? yarnData
        : yarnData.filter((d) =>
            d.details.fibers.some((f) => f.fiber_type_name === selectedFiber)
          );*/
    const washableData = yarnData.filter(
      (d) => d.details.machine_washable === "TRUE"
    );
    const nonWashableData = yarnData.filter(
      (d) => d.details.machine_washable === "FALSE"
    );
    const filteredWashableData = filteredData.filter(
      (d) => d.details.machine_washable === "TRUE"
    );
    const filteredNonWashableData = filteredData.filter(
      (d) => d.details.machine_washable === "FALSE"
    );

    const totalWashable = washableData.length;
    const totalNonWashable = nonWashableData.length;

    const totalFilteredWashable = filteredWashableData.length;
    const totalFilteredNonWashable = filteredNonWashableData.length;
    //console.log(totalFilteredWashable);
    //g.selectAll(".median-line").data([medianValue])

    var washPercent = Math.round(
      (totalFilteredWashable /
        (totalFilteredNonWashable + totalFilteredWashable)) *
        100
    );
    if (totalFilteredNonWashable + totalFilteredWashable === 0) {
      washPercent = -1;
    }
    const sideLabels = g.selectAll(".side-labels").data([washPercent]);

    sideLabels
      .enter()
      .append("text")
      .attr("class", "side-labels")
      .attr(
        "transform",
        `translate(${margin.right + chartWidth + 80}, ${chartHeight / 2 - 50})`
      )
      .merge(sideLabels) //
      .each(function (d) {
        // Clear existing tspans to avoid duplication
        d3.select(this).selectAll("tspan").remove();

        // Add tspans for each line of text
        d3.select(this)
          .append("tspan")
          .text((d) => (d === -1 ? "N/A" : `${d}% Washable`)) // First line
          .attr("x", 0) // Reset x position
          .attr("dy", 0); // Keep the first line in the same position

        d3.select(this)
          .append("tspan")
          .text((d) => (d === -1 ? "N/A" : `${100 - d}% Not Washable`)) // Second line
          .attr("x", 0) // Reset x position
          .attr("dy", "5em"); // Shift second line down
      });
    //.text((d) => `${d}% Washable ${100 - d}% Not Washable`);

    /*sideLabels
      .enter()
      .append("text")
      .attr("transform", `translate(0, 40)`)
      .text(
        `${(
          (totalFilteredNonWashable /
            (totalFilteredNonWashable + totalFilteredWashable)) *
          100
        ).toFixed(0)}% Non Washable`
      );*/
    sideLabels.exit().remove();
    const ySpacingFactor = 1; // Scaling factor to increase vertical spacing
    const maxWashableSpacing =
      Math.min(chartHeight / 2 / (totalWashable + 1), 30) * ySpacingFactor;
    const maxNonWashableSpacing =
      Math.min(chartHeight / 2 / (totalNonWashable + 1), 30) * ySpacingFactor;

    const circles = g.selectAll("circle").data(filteredData, (d) => d.id);

    circles
      .enter()
      .append("circle")
      .attr("r", 2)
      .merge(circles)
      .attr("cx", (d) => xScale(d.syntheticPercentage))
      //.attr("cy", (d) => yScale(d.id))
      .attr("cy", (d, i) => {
        // Separate washable and non-washable yarns by the halfway axis
        const halfway = chartHeight / 2;
        // Calculate y position based on index and washable status
        if (d.details.machine_washable === "TRUE") {
          const index = washableData.indexOf(d);
          return halfway - (index + 1) * maxWashableSpacing;
        } else {
          const index = nonWashableData.indexOf(d);
          return halfway + (index + 1) * maxNonWashableSpacing; // Distribute below halfway
        }
      })
      .attr("fill", (d) =>
        d.details.machine_washable === "TRUE" ? "#80b1d3" : "#fb8072"
      )
      .on("mouseover", function (event, d) {
        const fibersInfo = Object.values(d.details.fibers)
          .map((f) => `${f.fiber_type_name}: ${f.percentage}%`)
          .join("<br>");
        tooltip
          .style("visibility", "visible")
          .html(`<strong>${d.details.name}</strong><br>${fibersInfo}`);
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", event.pageY + 10 + "px")
          .style("left", event.pageX + 10 + "px");
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
      });

    circles.exit().remove();

    // Calculate and update the median line
    const medianValue = calculateMedian(filteredData);

    const medianLine = g.selectAll(".median-line").data([medianValue]); // Single element for the line

    // Add or update the median line
    /*medianLine
      .enter()
      .append("line")
      .attr("class", "median-line")
      .attr("y1", 0)
      .attr("y2", chartHeight)
      .attr("stroke", "black")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 4")
      .merge(medianLine)
      .transition()
      .duration(1000) // Smooth sliding animation
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d));

    medianLine.exit().remove();*/
  }

  // Filter yarn data when checkboxes are updated
  const buttons = d3
    .select("#vis3-buttons")
    .selectAll(".button-container button, .label-container button");

  /*buttons.on("click", function () {
    const selectedFiber = this.dataset.filter; //"Cotton"
    buttons.classed("active", false);
    d3.select(this).classed("active", true);
    updateChart(selectedFiber); // get all that are selected
    const button = d3.select(this);
    const isActive = button.classed("active");
  
  // Set the active state to the opposite of the current state
    button.classed("active", !isActive);

  });*/
  buttons.on("click", function (event, d) {
    const button = d3.select(this);
    const isActive = button.classed("active");

    button
      .classed("active", !isActive)
      .attr("data-active", isActive ? "false" : "true");

    /*const activeFibers = buttons
      .filter(function (button) {
        return button.classed("active") === "true";
      })
      .data();*/

    // go through buttons and add to array
    //const activeFibers = ["Nylon"];
    updateChart();
  });

  updateChart();
}

// change names of things...later
function createRatingsChart(fiberRatings) {
  // Create dropdown menu options
  const fibers = Object.keys(fiberRatings);

  // SVG dimensions
  const width = 1000;
  const height = 600;
  const margin = { top: 20, right: 30, bottom: 20, left: 70 };

  const svg = d3.select("#vis2").attr("width", width).attr("height", height);

  const chartWidth = width - margin.left - margin.right - 200;
  const chartHeight = height - margin.top - margin.bottom - 100;

  const chartGroup = svg
    .append("g")
    .attr("transform", `translate(${margin.left + 30}, ${margin.top})`);

  //const tooltip = d3.select(".tooltip");

  // Scales
  const xScale = d3.scaleBand().range([0, chartWidth]).padding(0.1);

  const yScale = d3.scaleLinear().range([chartHeight, 0]); // Ratings go from bottom to top
  // make this count instead?
  // and map color to ratings

  // Axes
  const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
  const yAxis = d3.axisLeft(yScale);

  chartGroup
    .append("g")
    .attr("class", "vis2-x-axis")
    .attr("transform", `translate(0, ${chartHeight})`)
    .call(xAxis)
    .append("text")
    .attr("x", chartWidth / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Fiber Percentage");

  chartGroup
    .append("g")
    .attr("class", "vis2-y-axis")

    .call(yAxis)
    .append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 10)
    .attr("x", -chartHeight / 2)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Yarn Count");

  const ratingRanges = [
    "4.9-5.0",
    "4.7-4.8",
    "4.5-4.6",
    "4.3-4.4",
    "4.1-4.2",
    "3.9-4.0",
    "3.7-3.8",
    "Below 3.7",
  ];

  const colorPalette = [
    "#081d58",
    "#253494",
    "#225ea8",
    "#1d91c0",
    "#41b6c4",
    "#7fcdbb",
    "#c7e9b4",
    "#edf8b1",
    "#ffffd9",
    //081d58
    /*#5e4fa2",
    "#3288bd",
    "#1a9850",
    "#66bd63",
    "#a6d96a",
    "#d9ef8b",
    "#d9ef8b",
    "#fee08b",
    "#fdae61"*/
    // Gradient for ranges above 3.0
  ];

  // Create an ordinal scale for the colors
  const colorScale = d3.scaleOrdinal().domain(ratingRanges).range(colorPalette);

  function getRatingRange(rating) {
    if (rating < 3.7) return "Below 3.7"; // Assign "Below 3.0" for ratings less than 3.0
    if (rating > 3.6 && rating <= 3.8) return "3.7-3.8";
    if (rating > 3.8 && rating <= 4.0) return "3.9-4.0";
    if (rating > 4.0 && rating <= 4.2) return "4.1-4.2";
    if (rating > 4.2 && rating <= 4.4) return "4.3-4.4";
    if (rating > 4.4 && rating <= 4.6) return "4.5-4.6";
    if (rating > 4.6 && rating <= 4.8) return "4.7-4.8";
    if (rating > 4.8 && rating <= 5.0) return "4.9-5.0";
  }

  // Assuming you already have `ratingRanges` and `colorPalette` defined
  const legendWidth = 600;
  const legendHeight = 30;
  const legendSquareSize = 15; // Size of the color square
  const legendSpacing = 15; // Spacing between squares and text // worry about this later

  // Add legend group and place it to the right of the chart
  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr(
      "transform",
      `translate(${margin.right + chartWidth + 80}, ${margin.top})`
    ); // Move to the right of the chart

  // Add legend items vertically
  ratingRanges.forEach((range, i) => {
    const legendItem = legend
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", `translate(0, ${i * 25})`); // Stack items vertically with spacing

    // Add color square
    legendItem
      .append("rect")
      .attr("width", 15) // Width of the square
      .attr("height", 15) // Height of the square
      .attr("fill", colorPalette[i]) // Fill color from palette
      .attr("stroke", "#000") // Optional border
      .attr("stroke-width", 0.5);

    // Add text label
    legendItem

      .append("text")
      .attr("x", 20) // Position text to the right of the square
      .attr("y", 12) // Vertically align with the square
      .style("font-size", "12px")
      .text(range);
  });
  const tooltip = d3
    .select("body")
    .append("div")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.7)")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("visibility", "hidden")
    .style("font-size", "12px");
  // Update chart
  function updateChart(fiber) {
    const data = fiberRatings[fiber];

    // Compute average ratings for each percentage
    const percentageData = Object.entries(data.percentageRatings).map(
      ([percentage, ratings]) => ({
        percentage: +percentage,
        ratings: Math.round(d3.mean(ratings) * 10) / 10,
      })
    );
    const percentageCountData = Object.entries(data.percentageCounts).map(
      ([percentage, counts]) => ({
        percentage: +percentage,
        counts: +counts, // need to get the average
      })
    );

    const binGenerator = d3
      .bin()
      .domain([1, 100]) // Percentage range
      .thresholds([...d3.range(1, 101, 10)])
      //.thresholds(d3.range(1, 101, 10)) // Create bins (1-10%, 11-20%, ..., 91-100%)
      .value((d) => d.percentage); // Use "percentage" to bin data

    // Generate bins
    //const test =
    const temp1 = binGenerator(percentageCountData);

    const binnedCount = temp1.map((bin) => {
      const x1 = bin.x1 === 100 ? 100 : bin.x1 - 1;
      const percentage = `${x1}-${bin.x0}%`; // === 100 ? 100 : bin.x1 - 1}`;
      const counts = bin.length > 0 ? d3.sum(bin, (d) => d.counts) : 0;
      return { percentage, counts, x0: bin.x0, x1: bin.x1 };
    });

    const temp2 = binGenerator(percentageData);

    const binnedRatings = temp2.map((bin) => {
      const x1 = bin.x1 === 100 ? 100 : bin.x1 - 1;
      const percentage = `${x1}-${bin.x0}%`; // === 100 ? 100 : bin.x1 - 1}`;
      const ratings = bin.length > 0 ? d3.mean(bin, (d) => d.ratings) : 0;
      return { percentage, ratings, x0: bin.x0, x1: bin.x1 };
    });

    const binnedData = [];
    for (i = 0; i < binnedRatings.length; i++) {
      binnedData.push({
        percentage: binnedRatings[i].percentage, // e.g., "100-91"
        counts: binnedCount[i].counts, // Count of yarns in this range
        rating: binnedRatings[i].ratings, // Average rating of yarns in this range
      });
    }

    // Update y-axis domain based on the data
    xScale.domain(binnedData.map((d) => d.percentage).reverse());
    const maxCount = d3.max(binnedData, (d) => d.counts);
    yScale.domain([0, maxCount]);

    // Update y-axis
    d3.select(".vis2-x-axis").transition().duration(750).call(xAxis);
    d3.select(".vis2-y-axis").transition().duration(750).call(yAxis);

    // Bind data
    const bars = chartGroup
      .selectAll(".bar")
      .data(binnedData, (d) => d.percentage);

    // Enter phase
    bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.percentage))
      .attr("y", chartHeight) // Start from bottom
      .attr("width", xScale.bandwidth()) // Width matches space between ticks
      .attr("height", 0) // Start with no height
      .merge(bars) // Merge enter + update phases
      .on("mouseover", function (event, d) {
        tooltip
          .style("visibility", "visible")
          .html(
            `<strong>Average Rating: </strong><br>${
              Math.round(d.rating * 10) / 10
            }`
          );
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", event.pageY + 10 + "px")
          .style("left", event.pageX + 10 + "px");
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
      })
      .transition()
      .duration(750)
      .attr("x", (d) => xScale(d.percentage))
      .attr("y", (d) => yScale(d.counts))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => chartHeight - yScale(d.counts))
      .attr("fill", (d) => {
        const ratingRange = getRatingRange(Math.round(d.rating * 10) / 10); // Get the rating range for this bar
        return colorScale(ratingRange); // Use the colorScale to assign a color
      });

    // Exit phase
    bars.exit().transition().duration(750).attr("height", 0).remove();

    // Add labels
    const total = binnedData.values().reduce((sum, count) => sum + count, 0);
    const labels = chartGroup
      .selectAll(".label")
      .data(binnedData, (d) => d.percentage);

    labels
      .enter()
      .append("text")
      .attr("class", "label")
      .merge(labels)
      .transition()
      .duration(750)
      .attr("x", (d) => xScale(d.percentage) + xScale.bandwidth() / 2)
      .attr("y", (d) => yScale(d.counts) - 5)
      .attr("text-anchor", "middle")
      .text(
        (d) =>
          `${d.counts} (${(
            (d.counts / d3.sum(Object.values(data.percentageCounts))) *
            100
          ).toFixed(1)}%)`
      );

    labels.exit().remove();
  }

  const buttons = d3
    .select("#vis2-buttons")
    .selectAll(".button-container button, .label-container button");

  buttons.on("click", function () {
    const selectedFiber = this.dataset.filter; //"Cotton"
    buttons.classed("active", false);
    d3.select(this).classed("active", true);
    updateChart(selectedFiber);
  });

  updateChart("Nylon");
}

function createSplitBarchart(yarnBlend) {
  // create dictionary of animal fiber and synthetic fiber

  // Convert co-occurrence map to a more usable format
  const fibers = Array.from(yarnBlend.keys()); // List of fiber names
  const fiberMap = new Map(yarnBlend.entries());

  // Find the maximum count across all fibers for a static x-axis
  const maxCount = Math.max(
    ...yarnBlend.values().flatMap((obj) => obj.values())
  );

  const width = 1000;
  const height = 600;
  const margin = { top: 20, right: 80, bottom: 30, left: 100 };
  const chartWidth = width - margin.left - margin.right - 200;
  const chartHeight = height - margin.top - margin.bottom - 100;

  const svg = d3
    .select("#vis1")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const chartGroup = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create scales
  //const xScale = d3.scaleLinear().range([0, width]);
  const xScale = d3.scaleLinear().domain([0, maxCount]).range([0, chartWidth]); // Fixed domain
  const yScale = d3.scaleBand().range([0, chartHeight]).padding(0.1);
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);
  // Add axes groups

  chartGroup
    .append("g")
    .attr("class", "vis1-x-axis")

    .attr("transform", `translate(0, ${chartHeight})`)
    .call(xAxis)
    .append("text")
    .attr("class", "axis-style")
    .attr("x", chartWidth / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Yarn Count");

  chartGroup
    .append("g")
    .attr("class", "vis1-y-axis")

    .call(yAxis)
    .append("text")
    .attr("class", "axis-style")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 10)
    .attr("x", -chartHeight / 2)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Fiber");
  // Color mapping for blend types
  const blendColors = {
    "Synthetic-Synthetic": "#80b1d3", // Blue
    "Natural-Natural": "#b3de69", // Green
    "Synthetic-Natural": "#fb8072", // Red
    Other: "#cccccc", // Gray
  };

  const legendWidth = 600;
  const legendHeight = 30;
  const legendSquareSize = 15; // Size of the color square
  const legendSpacing = 15; // Spacing between squares and text // worry about this later

  // Add legend group and place it to the right of the chart
  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr(
      "transform",
      `translate(${margin.right + chartWidth + 120}, ${margin.top})`
    ); // Move to the right of the chart // Move to the right of the chart

  // Add legend items vertically
  var i = 0;
  for (const [fiber, color] of Object.entries(blendColors)) {
    const legendItem = legend
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", `translate(0, ${i * 25})`); // Stack items vertically with spacing

    // Add color square
    legendItem
      .append("rect")
      .attr("width", 15) // Width of the square
      .attr("height", 15) // Height of the square
      .attr("fill", color) // Fill color from palette
      .attr("stroke", "#000") // Optional border
      .attr("stroke-width", 0.5);

    // Add text label
    legendItem
      .append("text")

      .attr("x", 20) // Position text to the right of the square
      .attr("y", 12) // Vertically align with the square
      .style("font-size", "12px")
      .text(fiber);
    i += 1;
  }
  // Function to update the chart based on selected fiber
  function updateChart(selectedFiber) {
    const fiberSource = {
      Nylon: "Synthetic",
      Other: "Other",
      Cotton: "Natural",
      Wool: "Natural",
      Rayon: "Synthetic",
      Acrylic: "Synthetic",
      Polyester: "Synthetic",
      Mohair: "Natural",
      Merino: "Natural",
      Silk: "Natural",
      Cashmere: "Natural",
      Alpaca: "Natural",
    };

    const rawData = fiberMap.get(selectedFiber);
    const total = rawData.values().reduce((sum, count) => sum + count, 0);
    const data = Array.from(fiberMap.get(selectedFiber).entries())
      .map(([fiber, count]) => ({
        fiber,
        count,
        percentage: ((count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);

    // Update scales

    //xScale.domain([0, d3.max(data, (d) => d.count)]);
    yScale.domain(data.map((d) => d.fiber));

    // Bind data to bars
    const bars = chartGroup.selectAll(".bar").data(data, (d) => d.fiber);

    // Enter + Update
    bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("y", (d) => yScale(d.fiber))
      .attr("height", yScale.bandwidth())
      .attr("x", 0)
      .attr("width", 0) // Start with zero width for animation
      .merge(bars) // Update existing bars
      .transition()
      .duration(750)
      .attr("width", (d) => xScale(d.count))
      .attr("y", (d) => yScale(d.fiber))
      .attr("fill", (d) => {
        const fiber1 = selectedFiber;
        const fiber2 = d.fiber;
        let source1 = fiberSource[fiber1];
        let source2 = fiberSource[fiber2];
        if (source1 === "Other" || source2 === "Other")
          return blendColors["Other"];
        else if (source1 === "Synthetic" && source2 === "Synthetic")
          return blendColors["Synthetic-Synthetic"];
        else if (
          (source1 === "Synthetic" && source2 === "Natural") ||
          (source1 === "Natural" && source2 === "Synthetic")
        )
          return blendColors["Synthetic-Natural"];
        else if (source1 === "Natural" && source2 === "Natural")
          return blendColors["Natural-Natural"];
      });
    // Bind data to labels
    const labels = chartGroup.selectAll(".label").data(data, (d) => d.fiber);

    // Enter + Update
    labels
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", (d) => xScale(d.count) + 5) // Position text to the right of the bar
      .attr("y", (d) => yScale(d.fiber) + yScale.bandwidth() / 2) // Vertically center the text
      .attr("dy", "0.35em") // Fine-tune vertical alignment
      .text((d) => d.count)
      .merge(labels) // Update existing labels
      .transition()
      .duration(750)
      .attr("x", (d) => xScale(d.count) + 5)
      .attr("y", (d) => yScale(d.fiber) + yScale.bandwidth() / 2)
      .text((d) => `${d.count} (${d.percentage}%)`);

    // Exit
    bars.exit().remove();
    labels.exit().remove();

    // Update axes
    d3.select(".vis1-x-axis").transition().duration(750).call(xAxis);
    d3.select(".vis1-y-axis").transition().duration(750).call(yAxis);
  }

  const buttons = d3
    .select("#vis1-buttons")
    .selectAll(".button-container button, .label-container button");

  buttons.on("click", function () {
    const selectedFiber = this.dataset.filter; //"Cotton"
    buttons.classed("active", false);
    d3.select(this).classed("active", true);
    updateChart(selectedFiber);
  });

  // Initialize chart with the first fiber
  updateChart("Nylon");
}
