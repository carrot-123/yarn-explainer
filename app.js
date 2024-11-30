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

  // Step 2: Determine dominant fiber for each yarn
  const yarnFibers = {};
  fiberData.forEach((d) => {
    d.id = +d.id;
    d.percentage = +d.percentage; // Convert percentage to a number
    d.fiber_type_name = d.fiber_type_name;
    if (!yarnFibers[+d.id]) {
      yarnFibers[d.id] = [];
    }
    yarnFibers[d.id].push(d);
  });

  const yarnPoints = [];
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

    const popBlend = new Map([
      ["Nylon", "Merino"],
      ["Other", "Merino"],
      ["Cotton", "Acrylic"],
      ["Wool", "Nylon"],
      ["Rayon", "Cotton"],
      ["Acrylic", "Wool"],
      ["Polyester", "Acrylic"],
      ["Mohair", "Wool"],
      ["Merino", "Nylon"],
      ["Silk", "Merino"],
      ["Cashmere", "Merino"],
      ["Alpaca", "Wool"],
    ]);
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
            fiberEntry.percentageCounts[percentage].push(rating);
          } else {
            for (let j = 0; j < fiberNames.length; j++) {
              var fiber2 = fiberNames[j];
              if (other.has(fiber2)) {
                fiber2 = "Other";
              }

              //if (fiber2 === popBlend.get(fiber)) {
              /*if (!fiberEntry.percentageRatings[percentage]) {
                fiberEntry.percentageRatings[percentage] = [];
              }
              fiberEntry.percentageRatings[percentage].push(rating);*/
              if (!fiberEntry.percentageCounts[percentage]) {
                fiberEntry.percentageCounts[percentage] = 0;
              }
              fiberEntry.percentageCounts[percentage] += 1;
              if (!fiberEntry.percentageRatings[percentage]) {
                fiberEntry.percentageRatings[percentage] = [];
              }
              fiberEntry.percentageCounts[percentage].push(rating);
            }
            //}
            fiberEntry.multiFiberRatings.push(rating);
          }
          fiberEntry.allFiberRatings.push(rating);
        }
      }
    }
  }

  /*fibers.forEach(({ fiber_type_name, percentage }) => {
      // Initialize structure for the fiber if it doesn't exist
      if (!fiberRatings[fiber_type_name]) {
        fiberRatings[fiber_type_name] = {
          singleFiberRatings: [],
          multiFiberRatings: [],
          percentageRatings: {},
        };
      }

      const fiberEntry = fiberRatings[fiber_type_name];

      // Add the rating to the appropriate list
      if (isSingleFiber) {
        fiberEntry.singleFiberRatings.push(rating);
      } else {
        fiberEntry.multiFiberRatings.push(rating);
      }

      // Add the rating to the percentage-based dictionary
      // acrylic and wool only
      fibers.forEach(({ fiber_type_name, percentage }) => {
        if (popBlend[fiber_type_name]) { // acrylic at 20 percent and wool at x percent 
          if (!fiberEntry.percentageRatings[percentage]) {
            fiberEntry.percentageRatings[percentage] = [];
          }
          fiberEntry.percentageRatings[percentage].push(rating);
        }
      });
      
    });
  }*/

  // Find the dominant fiber
  /*const dominantFiber = fibers.reduce(
      (max, fiber) => (fiber.percentage > max.percentage ? fiber : max),
      fibers[0]
    );
    const rating = yarnRatings.get(dominantFiber.id);
    if (!other.has(dominantFiber.fiber_type_name)) {
      if (dominantFiber.percentage && rating) {
        yarnPoints.push({
          yarn_id: yarnId,
          fiber: dominantFiber.fiber_type_name,
          percentage: dominantFiber.percentage,
          rating: yarnRatings.get(dominantFiber.id),
        });
      }
    }
  }*/

  // Step 3: Create the scatterplot
  //createScatterplot(yarnPoints);
  console.log("hi");
  //console.log(yarnBlend);
  //createSplitBarchart(yarnBlend);

  createRatingsChart(fiberRatings);
});
// change names of things...later
function createRatingsChart(fiberRatings) {
  // Create dropdown menu options
  const fibers = Object.keys(fiberRatings);
  console.log(fiberRatings);
  /*const dropdown = d3.select("fiber-select");
  console.log(fibers);
  fibers.forEach((fiber) => {
    dropdown.append("option").text(fiber).attr("value", fiber);
  });*/
  const dropdown = d3.select("#fiber-select");
  dropdown
    .selectAll("option")
    .data(fibers)
    .enter()
    .append("option")
    .attr("value", (d) => d)
    .text((d) => d);

  // SVG dimensions
  const width = 800;
  const height = 400;
  const margin = { top: 20, right: 30, bottom: 50, left: 50 };

  const svg = d3.select("svg").attr("width", width).attr("height", height);

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const chartGroup = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const tooltip = d3.select(".tooltip");

  // Scales
  const xScale = d3
    .scaleLinear()
    .domain([100, 0]) // Percentages go from 100 to 0
    .range([0, chartWidth]);

  const yScale = d3.scaleLinear().domain([0, 1000]).range([chartHeight, 0]); // Ratings go from bottom to top
  // make this count instead?
  // and map color to ratings

  // Axes
  const xAxis = d3.axisBottom(xScale).ticks(10);
  const yAxis = d3.axisLeft(yScale);

  chartGroup
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${chartHeight})`)
    .call(xAxis);

  chartGroup.append("g").attr("class", "y-axis").call(yAxis);

  // Update chart
  function updateChart(fiber) {
    const data = fiberRatings[fiber];

    // Compute average ratings for each percentage
    const percentageData = Object.entries(data.percentageRatings).map(
      ([percentage, ratings]) => ({
        percentage: +percentage,
        averageRating: +ratings,
      })
    );
    const percentageCountData = Object.entries(data.percentageCounts).map(
      ([percentage, counts]) => ({
        percentage: +percentage,
        counts: +counts,
      })
    );

    // Update y-axis domain based on the data
    const maxCount = d3.max(percentageCountData, (d) => d.counts);
    yScale.domain([0, maxCount]);

    // Update y-axis
    d3.select(".y-axis").transition().duration(750).call(yAxis);

    // Bind data
    const bars = chartGroup
      .selectAll(".bar")
      .data(percentageData, (d) => d.percentage);

    // Enter phase
    bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.percentage))
      .attr("y", chartHeight) // Start from bottom
      .attr("width", chartWidth / percentageData.length - 5)
      .attr("height", 0) // Start with no height
      .merge(bars) // Merge enter + update phases
      .transition()
      .duration(750)
      .attr("x", (d) => xScale(d.percentage))
      .attr("y", (d) => yScale(d.averageRating))
      .attr("width", chartWidth / percentageData.length - 5)
      .attr("height", (d) => chartHeight - yScale(d.averageRating))
      .attr("fill", "#69b3a2");

    // Exit phase
    bars.exit().transition().duration(750).attr("height", 0).remove();

    // Add labels
    const labels = chartGroup
      .selectAll(".label")
      .data(percentageData, (d) => d.percentage);

    labels
      .enter()
      .append("text")
      .attr("class", "label")
      .merge(labels)
      .transition()
      .duration(750)
      .attr(
        "x",
        (d) =>
          xScale(d.percentage) + (chartWidth / percentageData.length - 5) / 2
      )
      .attr("y", (d) => yScale(d.averageRating) - 5)
      .attr("text-anchor", "middle")
      .text((d) => d.averageRating.toFixed(2));

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

function createSplitBarchart(yarnBlend) {
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
      .attr("y", (d) => yScale(d.fiber));
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
  console.log(fibers[0]);
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
