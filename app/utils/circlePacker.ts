// For a rectangular `area` with some `width`, `height`, `minRadius`, `maxRadius`
//     Where `width > maxRadius`, `height > maxRadius`, `maxRadius >= minRadius * 2`
//   Create a circle with random radius in range `[minRadius, maxRadius]` in the center and push it to the stack
//   While there are circles in the stack
//     Pop the `current` circle off the stack
//     Query for nearby circles using the quadtree
//       A nearby circle is any one which occupies the area defined by a circular area with `x = current.x`, `y = current.y`, and `radius = current.radius + maxRadius`, excluding `current`
//     Use the query result to identify the circular sectors around `current` which are unoccupied
//     An unoccupied sector accommodates a circle of maximum radius `effectiveMaxRadius = min(maxRadius, maxAvailableRadius, distanceToEdge / 2)` where `maxAvailableRadius = (current.r * Math.sin(theta / 2)) / (1 + Math.sin(theta / 2)`
//     While there are available sectors accommodating a `minRadius` circle, going clockwise
//       If `effectiveMaxRadius >= maxRadius + minRadius`
//         Create a circle of random radius in range `[minRadius, effectiveMaxRadius]`
//       Else if `inRange(effectiveMaxRadius, minRadius, maxRadius + minRadius)`
//         Create a circle of radius in range `[minRadius, maxRadius - minRadius]`
//       Else
//         Create a circle of radius `effectiveMaxRadius`
//       Place the new circle tangent to the near edge of the arc, and tangent to `current` (pack the sector as tightly as possible)
//       Update the available sectors to include the new circle
//       Push the new circle to the stack
