<?php
/**
 * Plugin Name: FTAS Content Model
 * Description: Custom post types and taxonomies for the FTAS headless website (products, services, case studies).
 * Version: 0.1.0
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'init', function () {
	$common = array(
		'public'       => true,
		'show_in_rest' => true,
		'has_archive'  => false,
		'supports'     => array( 'title', 'editor', 'excerpt', 'thumbnail', 'custom-fields', 'page-attributes' ),
	);

	register_post_type( 'product', array_merge( $common, array(
		'label'         => 'Products',
		'menu_icon'     => 'dashicons-products',
		'rest_base'     => 'products',
		'rewrite'       => array( 'slug' => 'products' ),
	) ) );

	register_post_type( 'service', array_merge( $common, array(
		'label'     => 'Services',
		'menu_icon' => 'dashicons-admin-tools',
		'rest_base' => 'services',
		'rewrite'   => array( 'slug' => 'services' ),
	) ) );

	register_post_type( 'case_study', array_merge( $common, array(
		'label'     => 'Case Studies',
		'menu_icon' => 'dashicons-portfolio',
		'rest_base' => 'case-studies',
		'rewrite'   => array( 'slug' => 'case-studies' ),
	) ) );

	register_taxonomy( 'industry', array( 'product', 'case_study' ), array(
		'label'             => 'Industries',
		'hierarchical'      => true,
		'show_in_rest'      => true,
		'rest_base'         => 'industries',
		'show_admin_column' => true,
	) );

	register_taxonomy( 'division', array( 'product', 'service' ), array(
		'label'             => 'Divisions',
		'hierarchical'      => true,
		'show_in_rest'      => true,
		'rest_base'         => 'divisions',
		'show_admin_column' => true,
	) );

	// Fields exposed in the REST API (no ACF needed; editable via the custom fields panel).
	$meta = array(
		'product'    => array(
			'status'   => 'string',   // Concept | In development | Live
			'tagline'  => 'string',
			'features' => 'string',   // one feature per line
		),
		'service'    => array(
			'deliverables' => 'string', // one item per line
		),
		'case_study' => array(
			'client'   => 'string',
			'problem'  => 'string',
			'solution' => 'string',
			'result'   => 'string',
		),
	);
	foreach ( $meta as $post_type => $fields ) {
		foreach ( $fields as $key => $type ) {
			register_post_meta( $post_type, $key, array(
				'type'              => $type,
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_textarea_field',
				'auth_callback'     => function () {
					return current_user_can( 'edit_posts' );
				},
			) );
		}
	}
} );

// Seed default taxonomy terms once.
register_activation_hook( __FILE__, function () {
	do_action( 'init' );
	$industries = array( 'Agriculture & Horticulture', 'Logistics & Transportation', 'Tourism & Hospitality', 'Commerce & Business', 'Safety & Civic Technology', 'Construction & Real Estate' );
	foreach ( $industries as $name ) {
		if ( ! term_exists( $name, 'industry' ) ) {
			wp_insert_term( $name, 'industry' );
		}
	}
	$divisions = array( 'Technology Products & SaaS', 'IT Services & Digital Solutions', 'Fintech & Financial Technology' );
	foreach ( $divisions as $name ) {
		if ( ! term_exists( $name, 'division' ) ) {
			wp_insert_term( $name, 'division' );
		}
	}
	flush_rewrite_rules();
} );

register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
