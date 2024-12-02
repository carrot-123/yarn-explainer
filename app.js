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

  const yarnBlend = new Map();
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

  // Step 3: Create the scatterplot
  //createScatterplot(yarnPoints);
  console.log("hi");
  //console.log(yarnBlend);

  createSplitBarchart(yarnBlend);
  //createRatingsChart(fiberRatings);
});

// change names of things...later
function createRatingsChart(fiberRatings) {
  // Create dropdown menu options
  const fibers = Object.keys(fiberRatings);

  const dropdown = d3.select("#fiber-select");
  dropdown
    .selectAll("option")
    .data(fibers)
    .enter()
    .append("option")
    .attr("value", (d) => d)
    .text((d) => d);

  // SVG dimensions
  const width = 1000;
  const height = 600;
  const margin = { top: 20, right: 30, bottom: 50, left: 50 };

  const svg = d3.select("svg").attr("width", width).attr("height", height);

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom - 100;

  const chartGroup = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const tooltip = d3.select(".tooltip");

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
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${chartHeight})`)
    .call(xAxis);

  chartGroup.append("g").attr("class", "y-axis").call(yAxis);

  const ratingRanges = [
    "Below 3.0",
    "3.0-3.1",
    "3.2-3.3",
    "3.4-3.5",
    "3.6-3.7",
    "3.8-3.9",
    "4.0-4.1",
    "4.2-4.3",
    "4.4-4.5",
    "4.6-4.7",
    "4.8-5.0",
  ];

  const colorPalette = [
    "#cccccc", // Singular color for "Below 3.0"
    "#d73027",
    "#f46d43",
    "#fdae61",
    "#fee08b",
    "#d9ef8b",
    "#a6d96a",
    "#66bd63",
    "#3288bd",
    "#5e4fa2",
    "#1a9850", // Gradient for ranges above 3.0
  ];
  //const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([3, 5]);

  // Create an ordinal scale for the colors
  const colorScale = d3.scaleOrdinal().domain(ratingRanges).range(colorPalette);

  function getRatingRange(rating) {
    if (rating < 3.0) return "Below 3.0"; // Assign "Below 3.0" for ratings less than 3.0
    if (rating >= 3.0 && rating <= 3.1) return "3.0-3.1";
    if (rating > 3.1 && rating <= 3.3) return "3.2-3.3";
    if (rating > 3.3 && rating <= 3.5) return "3.4-3.5";
    if (rating > 3.5 && rating <= 3.7) return "3.6-3.7";
    if (rating > 3.7 && rating <= 3.9) return "3.8-3.9";
    if (rating > 3.9 && rating <= 4.1) return "4.0-4.1";
    if (rating > 4.1 && rating <= 4.3) return "4.2-4.3";
    if (rating > 4.3 && rating <= 4.5) return "4.4-4.5";
    if (rating > 4.5 && rating <= 4.7) return "4.6-4.7";
    if (rating > 4.7 && rating <= 5.0) return "4.8-5.0";
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
    .attr("transform", `translate(${width}, ${margin.top})`); // Move to the right of the chart

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

  // Update chart
  function updateChart(fiber) {
    const data = fiberRatings[fiber];

    // Compute average ratings for each percentage
    const percentageData = Object.entries(data.percentageRatings).map(
      ([percentage, ratings]) => ({
        percentage: +percentage,
        ratings: d3.mean(ratings).toFixed(1),
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
      // 100 to 91%
      // 90% to 81%
      // 10 to 1%
      .thresholds([...d3.range(1, 101, 10)])
      //.thresholds(d3.range(1, 101, 10)) // Create bins (1-10%, 11-20%, ..., 91-100%)
      .value((d) => d.percentage); // Use "percentage" to bin data

    // Generate bins
    //const test =
    const temp1 = binGenerator(percentageCountData);

    const binnedCount = temp1.map((bin) => {
      const x1 = bin.x1 === 100 ? 100 : bin.x1 - 1;
      const percentage = `${x1}%-${bin.x0}%`; // === 100 ? 100 : bin.x1 - 1}`;
      const counts = bin.length > 0 ? d3.sum(bin, (d) => d.counts) : 0;
      return { percentage, counts, x0: bin.x0, x1: bin.x1 };
    });

    const temp2 = binGenerator(percentageData);

    const binnedRatings = temp2.map((bin) => {
      const x1 = bin.x1 === 100 ? 100 : bin.x1 - 1;
      const percentage = `${x1}%-${bin.x0}%`; // === 100 ? 100 : bin.x1 - 1}`;
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
    d3.select(".x-axis").transition().duration(750).call(xAxis);
    d3.select(".y-axis").transition().duration(750).call(yAxis);

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
      .transition()
      .duration(750)
      .attr("x", (d) => xScale(d.percentage))
      .attr("y", (d) => yScale(d.counts))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => chartHeight - yScale(d.counts))

      .attr("fill", (d) => {
        const ratingRange = getRatingRange(d.rating); // Get the rating range for this bar
        return colorScale(ratingRange); // Use the colorScale to assign a color
      });

    // Exit phase
    bars.exit().transition().duration(750).attr("height", 0).remove();

    // Add labels
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
      .text((d) => (d.counts > 0 ? d.counts.toFixed(1) : ""));

    labels.exit().remove();
  }

  // Dropdown change handler
  dropdown.on("change", function () {
    const selectedFiber = d3.select(this).property("value");
    updateChart(selectedFiber);
  });

  // Initialize chart with the first fiber
  updateChart(fibers[0]);
}

//////////////// DON"T TOUCH ///////
function createSplitBarchart(yarnBlend) {
  // create dictionary of animal fiber and synthetic fiber

  // Convert co-occurrence map to a more usable format
  const fibers = Array.from(yarnBlend.keys()); // List of fiber names
  const fiberMap = new Map(yarnBlend.entries());

  // Find the maximum count across all fibers for a static x-axis
  const maxCount = Math.max(
    ...yarnBlend.values().flatMap((obj) => obj.values())
  );

  // Set up the SVG canvas dimensions
  const margin = { top: 20, right: 30, bottom: 40, left: 100 };
  const width = 800 - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;

  const svg = d3
    .select("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const chartGroup = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create scales
  //const xScale = d3.scaleLinear().range([0, width]);
  const xScale = d3.scaleLinear().domain([0, maxCount]).range([0, width]); // Fixed domain
  const yScale = d3.scaleBand().range([0, height]).padding(0.1);

  // Add axes groups
  const xAxisGroup = chartGroup
    .append("g")
    .attr("transform", `translate(0, ${height})`);

  const yAxisGroup = chartGroup.append("g");

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

    // Color mapping for blend types
    const blendColors = {
      "Natural-Natural": "#66c2a5", // Green
      "Synthetic-Natural": "#fc8d62", // Orange
      "Synthetic-Synthetic": "#8da0cb", // Blue
      Other: "#cccccc", // Gray for unexpected cases
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
    xAxisGroup.transition().duration(750).call(d3.axisBottom(xScale));
    yAxisGroup.transition().duration(750).call(d3.axisLeft(yScale));
  }

  // Populate dropdown menu
  const dropdown = d3.select("#fiber-select");
  dropdown
    .selectAll("option")
    .data(fibers)
    .enter()
    .append("option")
    .attr("value", (d) => d)
    .text((d) => d);

  // Initialize the chart with the first fiber

  updateChart(fibers[0]);

  // Update chart on dropdown change
  dropdown.on("change", function () {
    const selectedFiber = this.value;
    updateChart(selectedFiber);
  });
}

function createScatterplot(data) {
  // Dimensions and margins
  const margin = { top: 60, right: 60, bottom: 60, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 800 - margin.top - margin.bottom;

  // Color scale for fibers
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Append SVG
  //var container = d3.create("div");
  const svg = d3
    .select("svg")

    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // X scale
  const x = d3.scaleLinear().domain([0, 100]).range([0, width]);

  // Y scale
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.rating)])
    .nice()
    .range([height, 0]);

  // Add X axis
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .style("text-anchor", "middle")
    .text("Fiber Percentage (%)");

  // Add Y axis
  svg.append("g").call(d3.axisLeft(y));

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 10)
    .attr("x", -height / 2)
    .attr("dy", "-1em")
    .style("text-anchor", "middle")
    .text("Rating");

  // Add dots
  const tooltip = d3.select("#tooltip");

  svg
    .selectAll(".dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", (d) => x(d.percentage))
    .attr("cy", (d) => y(d.rating))
    .attr("r", 5)
    .attr("fill", (d) => color(d.fiber))
    .on("mouseover", (event, d) => {
      svg
        .append("text")
        .attr("class", "ptLabel")
        .attr("x", x(d.percentage))
        .attr("y", y(d.rating))
        .text(`Yarn ID: ${d.yarn_id}, Fiber: ${d.fiber}`);
    })
    .on("mouseout", () => {
      svg.selectAll(".ptLabel").remove();
    });

  // Add legend
  const fibers = Array.from(new Set(data.map((d) => d.fiber)));
  const legend = svg
    .append("g")
    .attr("transform", `translate(${width - 150}, 20)`);

  fibers.forEach((fiber, i) => {
    const legendRow = legend
      .append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    legendRow
      .append("rect")
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", color(fiber));

    legendRow
      .append("text")
      .attr("x", 15)
      .attr("y", 10)
      .attr("font-size", "12px")
      .attr("text-anchor", "start")
      .text(fiber);
  });
}
