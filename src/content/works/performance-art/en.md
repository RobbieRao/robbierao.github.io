## The board had to remain usable inside the robot

I was the third author and independently designed the circuit schematic and PCB for the adapted robotic unit. The team extended Rovable’s magnetic clothing robot to a larger fabric surface for performance. My board had to provide motor control, programming and charging within that assembly.

<figure>
<a href="/images/notebook/performance-art/figure-2b-circuit.png"><img src="/images/notebook/performance-art/figure-2b-circuit.png" alt="My circuit schematic, reproduced from paper Figure 2b. USB and charging sit above the controller; the serial/programming path and two motor channels are drawn separately." width="1409" height="527" loading="lazy" decoding="async" /></a>
<figcaption>My circuit schematic, reproduced from paper Figure 2b. USB and charging sit above the controller; the serial/programming path and two motor channels are drawn separately.</figcaption>
</figure>

I worked from the operations the assembled unit still needs: connect its motors, charge it, update firmware and reset it. The ESP32-C3FH4 receives commands over Wi-Fi and drives the wheels. I kept USB programming and hardware reset in the circuit as well. Wireless operation was only one part of the unit’s use; charging and firmware access still depended on physical connections.

Wheel geometry and the magnetic mounting constrain the available space and routes to the motors. The mechanical redesign was a team contribution. On the electrical side, I kept those interfaces explicit so that the circuit could be checked against the object it would actually inhabit.

## One Type-C connector, two different paths

In the original schematic, USB Type-C supplies the input and the TP4056 handles charging through the battery connector. CHRG and STDBY drive charging-state indications. The NCP1117-3.3 creates the +3.3 V rail shown at the controller, CH340C and motor-driver sections. I separate the charging route from the regulated supply when checking the drawing; sharing a connector does not make them the same circuit function.

USB also carries data. D+ and D− reach the CH340C, whose serial transmit and receive lines connect to the controller. Two S8050 transistors form the download-control logic, with a separate hardware reset button. Programming and recovery therefore have a wired route that does not depend on a working wireless application.

I drew the motor channels as separate repeated sections. Each TC118S takes INA1/INB1 or INA2/INB2 and connects OUTA/OUTB to its two-pin motor connector. Local supply and output capacitors remain visible beside those paths. Following a controller pin to a connector is then straightforward, including when the mechanical assembly changes around it.

The controller also needs its antenna connection, clock, supply and reset networks. I use the simplified functional drawing to trace those responsibilities quickly, then return to the original schematic for components and net details. The simplified view helps locate a connection; the original drawing lets it be checked.

<figure class="diagram">
<a href="/images/figures/performance-art-en.svg"><img src="/images/figures/performance-art-en.svg" alt="Functional reading of the original Figure 2b: charging and regulation, USB serial and download logic, and two motor-control channels. The original schematic preserves the detailed components and nets." width="900" height="710" loading="lazy" decoding="async" /></a>
<figcaption>Functional reading of the original Figure 2b: charging and regulation, USB serial and download logic, and two motor-control channels. The original schematic preserves the detailed components and nets.</figcaption>
</figure>

## The connectors also belonged to the mechanical assembly

In the PCB design, I considered supply and return paths alongside the signal connections. Motors present a changing load; the controller, serial interface and radio share the limited board area. The regulator and local capacitors, charging section, motor outputs and antenna connection therefore gave the layout different constraints. Treating every connection as an equivalent line on the schematic would hide those differences.

Type-C, reset, battery and motor connections also tied the layout to the surrounding structure. Their positions affected how the unit could be assembled and maintained. Looking back at the board, this is the part of PCB work that the schematic shows least clearly: a correct electrical connection still has to become a reachable physical connection inside the object.

The team’s tread comparison concerned wheel contact with fabric: more tread-fold inflection points gave stronger adhesion in the tested variants. Tracking and visuals sit farther along the system: IP cameras observe magnetic ArUco markers, OpenCV estimates pose, and those estimates drive procedural imagery and StreamDiffusion. These surround my hardware work. A motor output, an estimated pose and a projected pattern need different inspection points.

## What the exhibition system made visible about the board

The team demonstrated the integrated prototype in a live exhibition. Seeing the board as part of that system made its responsibilities clearer to me. It supplied and drove the robotic unit; cameras estimated motion, and the visual pipeline interpreted those estimates. The projected image was the result of all of those stages, not a direct display of the electrical state.

That distinction matters when reading the demonstration. A projection can continue animating without proving that tracking is updating; a changed pose estimate does not describe the motor’s electrical state. The circuit drawing and the system diagram answer different questions. Keeping both in the project record lets me show my hardware contribution without claiming the tracking or image-generation work as my own.

<figure>
<a href="/images/research/experience/performance-art.webp"><img src="/images/research/experience/performance-art.webp" alt="The integrated installation places the board inside a larger chain of fabric movement, pose tracking and responsive imagery." width="1400" height="796" loading="lazy" decoding="async" /></a>
<figcaption>The integrated installation places the board inside a larger chain of fabric movement, pose tracking and responsive imagery.</figcaption>
</figure>

The wired programming and reset path is a small part of the schematic, but it captures an important lesson from this design. A robot that normally receives commands wirelessly still needs a way to be programmed and recovered independently of that wireless application. Charging, programming and moving the wheels are separate uses of the same board; none disappears just because the exhibition emphasizes motion.

#### A practical diagnostic order

| Layer | Inspect before proceeding |
| --- | --- |
| Mechanics | Fabric contact, wheel grip and the revised component package. |
| Sensing | Marker visibility and position/orientation estimates. |
| Mapping | A simple visual representation of tracked movement. |
| Performance | Response timing and coordination across multiple units. |

## Tools, in context

<dl class="tools">
<div><dt>Circuit schematic · PCB design</dt><dd>My independent contribution: power, charging, USB serial/programming, controller, and motor-driver circuits.</dd></div>
<div><dt>ESP32-C3FH4 · TC118S</dt><dd>Wi-Fi-capable controller and two motor-driver channels on the adapted unit.</dd></div>
<div><dt>TP4056 · NCP1117-3.3 · CH340C</dt><dd>Charging, 3.3 V regulation, and the USB-to-serial development interface.</dd></div>
<div><dt>Team interfaces · tracking and projection</dt><dd>ArUco/OpenCV pose estimates and procedural/StreamDiffusion imagery form the surrounding team system.</dd></div>
</dl>
