"use client";
import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const Car = ({ obstacles }) => {
  const { scene } = useGLTF("/khronos_gltf_sample_model_-_toy_car/scene.gltf");
  const carRef = useRef();

  const [position, setPosition] = useState([0, 1, 0]);
  const [rotation, setRotation] = useState(0);
  const [velocity, setVelocity] = useState(new THREE.Vector3(0, 0, 0));

  const [keys, setKeys] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  const acceleration = 30;
  const friction = 3;

  useEffect(() => {
    scene.scale.set(10, 10, 10);
    scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    carRef.current.add(scene);
  }, [scene]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
          setKeys((keys) => ({ ...keys, forward: true }));
          break;
        case "ArrowDown":
        case "s":
          setKeys((keys) => ({ ...keys, backward: true }));
          break;
        case "ArrowLeft":
        case "a":
          setKeys((keys) => ({ ...keys, left: true }));
          break;
        case "ArrowRight":
        case "d":
          setKeys((keys) => ({ ...keys, right: true }));
          break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
          setKeys((keys) => ({ ...keys, forward: false }));
          break;
        case "ArrowDown":
        case "s":
          setKeys((keys) => ({ ...keys, backward: false }));
          break;
        case "ArrowLeft":
        case "a":
          setKeys((keys) => ({ ...keys, left: false }));
          break;
        case "ArrowRight":
        case "d":
          setKeys((keys) => ({ ...keys, right: false }));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const checkCollisions = (newPosition) => {
    const carBox = new THREE.Box3().setFromObject(carRef.current);
    carBox.translate(
      new THREE.Vector3(...newPosition).sub(carRef.current.position),
    );

    for (const obstacle of obstacles.current) {
      const obstacleBox = new THREE.Box3().setFromObject(obstacle);
      if (carBox.intersectsBox(obstacleBox)) {
        return true;
      }
    }
    return false;
  };

  useFrame((state, delta) => {
    const moveVector = new THREE.Vector3(0, 0, 0);

    if (keys.forward) {
      moveVector.x += Math.sin(rotation) * acceleration * delta;
      moveVector.z -= Math.cos(rotation) * acceleration * delta;
    }
    if (keys.backward) {
      moveVector.x -= Math.sin(rotation) * acceleration * delta;
      moveVector.z += Math.cos(rotation) * acceleration * delta;
    }

    let newRotation = rotation;
    if (keys.left) {
      newRotation += 2 * delta;
    }
    if (keys.right) {
      newRotation -= 2 * delta;
    }

    const newVelocity = velocity.clone().add(moveVector);
    newVelocity.multiplyScalar(1 - friction * delta);

    const tempPosition = new THREE.Vector3(...position).add(
      newVelocity.clone().multiplyScalar(delta),
    );

    if (!checkCollisions(tempPosition.toArray())) {
      setPosition(tempPosition.toArray());
      setVelocity(newVelocity);
      setRotation(newRotation);

      carRef.current.position.copy(tempPosition);
      carRef.current.rotation.y = -newRotation;
    } else {
      // Handle sliding along the obstacle
      const slideVectorX = newVelocity.clone().setZ(0).multiplyScalar(delta);
      const slideVectorZ = newVelocity.clone().setX(0).multiplyScalar(delta);
      const tempPositionX = new THREE.Vector3(...position).add(slideVectorX);
      const tempPositionZ = new THREE.Vector3(...position).add(slideVectorZ);

      const collidedX = checkCollisions(tempPositionX.toArray());
      const collidedZ = checkCollisions(tempPositionZ.toArray());

      if (!collidedX) {
        setPosition(tempPositionX.toArray());
        carRef.current.position.copy(tempPositionX);
      } else if (!collidedZ) {
        setPosition(tempPositionZ.toArray());
        carRef.current.position.copy(tempPositionZ);
      }

      setRotation(newRotation);
      carRef.current.rotation.y = -newRotation;

      // Update the velocity after handling collisions
      setVelocity(newVelocity);
    }

    // Update the camera position and rotation
    const cameraOffset = new THREE.Vector3(0, 5, 10).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -newRotation,
    );
    const cameraPosition = tempPosition.clone().add(cameraOffset);
    const cameraLookAt = tempPosition.clone().add(new THREE.Vector3(0, 2, 0));

    state.camera.position.copy(cameraPosition);
    state.camera.lookAt(cameraLookAt);
  });

  return (
    <>
      <group ref={carRef} />
      {/* Debug visualization */}
      <mesh position={position}>
        <boxGeometry args={[2, 1, 4]} />
        <meshBasicMaterial wireframe color="red" />
      </mesh>
    </>
  );
};

const Ground = () => {
  const ref = useRef();
  useEffect(() => {
    ref.current.rotation.x = -Math.PI / 2;
    ref.current.position.y = 0;
  }, []);
  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <shadowMaterial opacity={0.5} />
    </mesh>
  );
};

const Obstacle = ({ position, obstaclesRef }) => {
  const ref = useRef();
  useEffect(() => {
    obstaclesRef.current.push(ref.current);
  }, [obstaclesRef]);
  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
};

export default function HomePage() {
  const obstaclesRef = useRef([]);

  return (
    <div className="h-screen w-screen">
      <Canvas shadows camera={{ position: [5, 5, 15], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <spotLight
          position={[10, 20, 10]}
          angle={0.3}
          penumbra={1}
          castShadow
        />
        <Car obstacles={obstaclesRef} />
        <Ground />
        <Obstacle position={[0, 1, -10]} obstaclesRef={obstaclesRef} />
        <Obstacle position={[10, 1, 0]} obstaclesRef={obstaclesRef} />
        <gridHelper args={[100, 100]} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
